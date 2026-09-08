import {categories,config} from './config.js';
const names=['Alex R','Jamie T','Sam K','Casey M','Jordan P','Morgan L','Oliver M','Riley B','Taylor H','Robin W','Drew C','Avery D','Elliot F','Quinn S','Charlie N','Harper J','Finley G','Rowan E'];
const messages=['Developed an elegant solution to a difficult Python problem.','Supported another learner through a challenging networking task.','Produced their strongest piece of project work so far.','Completed additional work on their game environment.','Took responsibility for organising their project team.','Persisted through technical issues and successfully solved the problem.'];
export function createDemo(now=new Date()) {
  const learners=names.map((n,i)=>({id:`demo-${i}`,first_name:n.split(' ')[0],surname_initial:n.split(' ')[1],course_or_group:['Level 3 Computing','T Level Digital','Level 2 IT'][i%3],active:true,created_at:now.toISOString()}));
  const totals=[14,12,10,9,7,6,5,5,4,4,3,3,2,2,1,1,1,0], month=[3,5,2,4,1,2,1,2,1,1,1,1,1,1,1,1,1,0];
  const awards=[];
  learners.forEach((l,i)=>{for(let j=0;j<totals[i];j++){
    const date=j<month[i]?new Date(now.getFullYear(),now.getMonth(),Math.max(1,now.getDate()-j),Math.max(0,now.getHours()-i%5),0):new Date(now.getFullYear(),now.getMonth()-1,10+j,12);
    awards.push({id:`award-${i}-${j}`,learner_id:l.id,staff_id:'demo-staff',category:categories[(i+j+6)%categories.length].id,public_message:j===0?messages[i%messages.length]:'',awarded_at:new Date(Math.min(date.getTime(),now.getTime())).toISOString(),created_at:date.toISOString()});
  }});
  return {learners,awards};
}
export const demoKey=`duck-race-demo-v1-${config.academicYear}`;
