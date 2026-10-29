(function(root){
  'use strict';
  function normalizeAnswer(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  function shuffle(values,random=Math.random){const copy=values.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function sampleQuestions(bank,count=10,random=Math.random){
    const seen=new Set();
    return shuffle(bank,random).filter(item=>{const key=normalizeAnswer(item.title);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,count).map(item=>{
      const answers=shuffle(item.answers.map((text,index)=>({text,correct:index===item.correct})),random);
      return {...item,answers:answers.map(a=>a.text),correct:answers.findIndex(a=>a.correct)};
    });
  }
  function scoreAssessment(questions,answers){let score=0;const wrong=[];questions.forEach((question,index)=>{
    const raw=answers[index];const answer=raw===null||raw===undefined||raw===''?-1:Number(raw);
    if(Number.isInteger(answer)&&answer===question.correct)score++;else wrong.push({index,why:question.why,correct:question.answers[question.correct]});
  });return {score,total:questions.length,wrong};}
  root.DongHoHeritageCore={normalizeAnswer,shuffle,sampleQuestions,scoreAssessment};
})(typeof window!=='undefined'?window:globalThis);
