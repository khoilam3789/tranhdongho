"""Free Edge Vietnamese narration; FFmpeg stays local. Input JSON via stdin."""
import asyncio
import json
import os
from pathlib import Path
import re
import subprocess
import sys

VOICES = ('vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural')

def run(args, timeout=90):
    return subprocess.run(args, capture_output=True, timeout=timeout,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)

def main():
    import edge_tts
    import aiohttp
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    if '--check' in sys.argv:
        if run([ffmpeg, '-version'], 10).returncode:
            raise RuntimeError('ffmpeg')
        print(json.dumps({'available': True}))
        return
    data = json.load(sys.stdin)
    if data.get('mode') == 'join':
        folder = Path(data['directory']).resolve()
        durations = data['durations']
        if not 2 <= len(durations) <= 3 or any(v not in (5, 10) for v in durations) or sum(durations) > 30:
            raise ValueError('invalid_segments')
        first = run([ffmpeg, '-nostdin', '-protocol_whitelist', 'file,pipe', '-i', str(folder / 'clip-0.mp4')], 15)
        dimensions = re.search(rb'Video: [^\r\n]*? (\d{2,5})x(\d{2,5})[ ,]', first.stderr)
        if not dimensions:
            raise ValueError('invalid_video')
        width, height = (int(value) for value in dimensions.groups())
        if width > 2048 or height > 2048 or width % 2 or height % 2:
            raise ValueError('invalid_dimensions')
        args = [ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y']
        filters = []
        for index, seconds in enumerate(durations):
            args += ['-protocol_whitelist', 'file,pipe', '-i', str(folder / f'clip-{index}.mp4')]
            filters.append(f'[{index}:v:0]scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,tpad=stop_mode=clone:stop_duration=1,trim=duration={seconds},setpts=PTS-STARTPTS[v{index}]')
        filters.append(''.join(f'[v{index}]' for index in range(len(durations))) + f'concat=n={len(durations)}:v=1:a=0,fps=24,tpad=stop_mode=clone:stop_duration=1,trim=duration={sum(durations)},setpts=PTS-STARTPTS[outv]')
        args += ['-filter_complex', ';'.join(filters), '-map', '[outv]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(folder / 'output.mp4')]
        if run(args, 120).returncode:
            raise RuntimeError('join_failed')
        print(json.dumps({'available': True, 'duration': sum(durations)}))
        return
    text = data['narration'].strip()
    voice = data['voice']
    if not text or len(text) > 1600 or voice not in VOICES:
        raise ValueError('invalid_narration')
    folder = Path(data['directory']).resolve()
    source, speech, output = (folder / name for name in ('input.mp4', 'speech.mp3', 'output.mp4'))
    async def synthesize():
        # A free read request may transiently return no audio. Retry only TTS,
        # never the upstream video job, and never switch to a paid provider.
        for attempt in range(2):
            try:
                await asyncio.wait_for(edge_tts.Communicate(text, voice, receive_timeout=35).save(str(speech)), 40)
                return
            except (edge_tts.exceptions.NoAudioReceived, aiohttp.ClientError, asyncio.TimeoutError):
                if attempt:
                    raise
                await asyncio.sleep(1)
    asyncio.run(asyncio.wait_for(synthesize(), 90))
    # Probe with the bundled FFmpeg; no remote media or playlists are allowed.
    def duration(file):
        result = run([ffmpeg, '-nostdin', '-protocol_whitelist', 'file,pipe', '-i', str(file)], 15)
        match = re.search(rb'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
        if not match:
            raise ValueError('invalid_media')
        h, m, s = (float(x) for x in match.groups())
        value = h * 3600 + m * 60 + s
        if not 0 < value <= 300:
            raise ValueError('media_too_long')
        return value
    video_seconds, speech_seconds = duration(source), duration(speech)
    target = max(video_seconds, speech_seconds)
    result = run([ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                  '-protocol_whitelist', 'file,pipe', '-i', str(source),
                  '-protocol_whitelist', 'file,pipe', '-i', str(speech),
                  '-map', '0:v:0', '-map', '1:a:0',
                  '-vf', f'tpad=stop_mode=clone:stop_duration={speech_seconds},format=yuv420p',
                  '-af', 'apad', '-t', str(target), '-c:v', 'libx264', '-preset', 'fast',
                  '-crf', '20', '-threads', '2', '-c:a', 'aac', '-b:a', '128k',
                  '-movflags', '+faststart', str(output)], 120)
    if result.returncode or not output.is_file() or output.stat().st_size > 128 * 1024 * 1024:
        raise RuntimeError('mux_failed')
    print(json.dumps({'available': True, 'duration': target, 'speechDuration': speech_seconds}))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never expose narration, provider URLs or raw network errors.
        print(json.dumps({'available': False, 'error': 'narration_failed'}))
        sys.exit(1)
