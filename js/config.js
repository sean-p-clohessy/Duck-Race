export const config = {
  department:'Digital Technologies', college:'Boston College', academicYear:'2026/27',
  seasonStart:'2026-08-01', seasonEnd:'2027-08-01', timeZone:'Europe/London',
  raceLanes:10, monthlySize:5, feedSize:12, refreshMs:20000, feedMs:9000,
  features:{displayMode:true, earnSection:true},
  text:{title:'The Duck Race', principle:'Ducks recognise moments that stand out. As you develop, what counts as going above and beyond may develop with you too.'}
};
export const categories = [
  {id:'outstanding-work',icon:'✦',name:'Outstanding Work',description:'For work that stands out significantly in quality, ambition or execution.'},
  {id:'above-beyond',icon:'↗',name:'Going Above & Beyond',description:'For doing considerably more than was reasonably expected.'},
  {id:'improvement',icon:'⌁',name:'Brilliant Improvement',description:'For clear and meaningful progress from your previous standard.'},
  {id:'helping',icon:'◎',name:'Helping Others',description:'For making a meaningful contribution to another learner’s learning or success.'},
  {id:'professional',icon:'▣',name:'Professional Behaviour',description:'For demonstrating particularly strong workplace or professional behaviours.'},
  {id:'resilience',icon:'↻',name:'Resilience & Perseverance',description:'For persisting through a genuinely difficult challenge or setback.'},
  {id:'creativity',icon:'✳',name:'Creativity & Problem Solving',description:'For particularly effective, innovative or thoughtful problem solving.'},
  {id:'contribution',icon:'◇',name:'Contribution to Digital',description:'For making a meaningful positive contribution to the wider Digital Technologies community.'}
];
export const category = id => categories.find(c=>c.id===id) || {name:id,description:'',icon:'✦'};
