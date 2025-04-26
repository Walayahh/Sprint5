// --- tab switching ---
const tabs=document.querySelectorAll('.tabs button');
const sections=document.querySelectorAll('main .tab');

tabs.forEach(btn=>btn.addEventListener('click',()=>{
  tabs.forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  sections.forEach(sec=>sec.classList.add('hidden'));
  document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
  if(btn.dataset.tab==='maps') loadMap();
}));

// --- theme toggle ---
const themeBtn=document.getElementById('theme-toggle');
const storedTheme=localStorage.getItem('theme')||'dark';
setTheme(storedTheme);
function setTheme(t){document.body.dataset.theme=t;localStorage.setItem('theme',t);}
themeBtn.onclick=()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark');

// --- Google auth init (runs once) ---
initGoogleClient();

document.getElementById('gmail-signin').onclick=async()=>{
  const user=await window.gapi.auth2.getAuthInstance().signIn();
  document.getElementById('gmail-status').textContent='Hello '+user.getBasicProfile().getGivenName();
  showGmail();
};
async function showGmail(){
  const list=await listGmailThreads();
  const ul=document.getElementById('gmail-list');ul.innerHTML='';
  list.forEach(t=>{const li=document.createElement('li');li.textContent=`📧 ${t.snippet}`;ul.appendChild(li);});
}

// Calendar events
 document.getElementById('calendar-refresh').onclick=async()=>{
   const ev=await listCalendarEvents();
   const ul=document.getElementById('calendar-events');ul.innerHTML='';
   ev.forEach(e=>{const li=document.createElement('li');li.textContent=`${new Date(e.start.dateTime||e.start.date).toLocaleString()} – ${e.summary}`;ul.appendChild(li);});
 };
document.getElementById('calendar-add-session').onclick=addCalendarFocus;

// Sheets export
 document.getElementById('sheets-export').onclick=exportHistory;

// Bored tab
const gameUl=document.getElementById('game-links');games.forEach(g=>{const li=document.createElement('li');const a=document.createElement('a');a.href=g.url;a.textContent=g.name;a.target='_blank';li.appendChild(a);gameUl.appendChild(li);});
document.getElementById('random-game').onclick=()=>{const g=games[Math.floor(Math.random()*games.length)];window.open(g.url,'_blank');};

// DeepSeek ask
const askBtn=document.getElementById('deepseek-ask');
askBtn.onclick=async()=>{
  const key=document.getElementById('deepseek-key').value.trim();
  const q=document.getElementById('deepseek-question').value.trim();
  if(!key||!q) return alert('Enter key and question');
  document.getElementById('deepseek-answer').textContent='Thinking…';
  try{const ans=await askDeepSeek(key,q);document.getElementById('deepseek-answer').textContent=ans;}
  catch(e){document.getElementById('deepseek-answer').textContent='Error: '+e.message;}
};

// -- Google client config --
const CLIENT_ID='638238698467-gigejpdafltbq74pg31o2vhmcb3dmm4u.apps.googleusercontent.com';
const API_KEY='AIzaSyB1VBqi1FAQ-jpW7dYiC4X_UYPk-IeU6pA';
const SCOPES='https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets';
let googleInited=false;

export function initGoogleClient(){
  if(googleInited) return;
  const script=document.createElement('script');
  script.src='https://apis.google.com/js/api.js';
  script.onload=()=>gapi.load('client:auth2',async()=>{
    await gapi.client.init({apiKey:API_KEY,clientId:CLIENT_ID,scope:SCOPES,discoveryDocs:[
      'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
      'https://sheets.googleapis.com/$discovery/rest?version=v4'
    ]});
    googleInited=true;console.log('GAPI ready');
  });
  document.head.appendChild(script);
}

export async function listGmailThreads(){
  const res=await gapi.client.gmail.users.messages.list({userId:'me',maxResults:5});
  const msgs=await Promise.all(res.result.messages.map(m=>gapi.client.gmail.users.messages.get({userId:'me',id:m.id,format:'metadata'})));
  return msgs.map(m=>({snippet:m.result.snippet}));
}

export async function listCalendarEvents(){
  const now=new Date().toISOString();
  const res=await gapi.client.calendar.events.list({calendarId:'primary',timeMin:now,showDeleted:false,singleEvents:true,maxResults:5,orderBy:'startTime'});
  return res.result.items;
}
export async function addCalendarFocus(){
  const start=new Date();
  const end=new Date(start.getTime()+25*60000);
  const ev={summary:'Focus Session',start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}};
  await gapi.client.calendar.events.insert({calendarId:'primary',resource:ev});
  alert('Session added to Calendar');
}

export async function exportHistory(){
  const hist=JSON.parse(localStorage.getItem('studyBuddyHistory')||'[]');
  if(!hist.length) return alert('No history');
  const sheetTitle='StudyBuddy Sessions';
  // create sheet if not exists, simplistic
  const createRes=await gapi.client.sheets.spreadsheets.create({properties:{title:sheetTitle}});
  const id=createRes.result.spreadsheetId;
  const values=[["Session","Duration(min)","Timestamp"],...hist.map(h=>[h.sessionNumber,h.duration,h.timestamp])];
  await gapi.client.sheets.spreadsheets.values.update({spreadsheetId:id,range:'A1',valueInputOption:'RAW',resource:{values}});
  document.getElementById('sheets-status').textContent='Sheet created: https://docs.google.com/spreadsheets/d/'+id;
}

// Maps
let mapLoaded=false;
export function loadMap(){
  if(mapLoaded) return;
  const script=document.createElement('script');
  script.src=`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initMap`;
  script.async=true;window.initMap=()=>{
    navigator.geolocation.getCurrentPosition(pos=>{
      const {latitude,longitude}=pos.coords;
      const map=new google.maps.Map(document.getElementById('map'),{center:{lat:latitude,lng:longitude},zoom:14});
      const service=new google.maps.places.PlacesService(map);
      service.nearbySearch({location:{lat:latitude,lng:longitude},radius:2000,keyword:'coffee'},(results)=>{
        results.forEach(p=>new google.maps.Marker({map,position:p.geometry.location,title:p.name}));
      });
    });
  };
  document.head.appendChild(script);mapLoaded=true;
}

// Games list
export const games=[
  {name:'Google Snake',url:'https://www.google.com/fbx?fbx=snake_arcade'},
  {name:'Pac‑Man Doodle',url:'https://www.google.com/logos/2010/pacman10‑i.html'},
  {name:'Quick Draw!',url:'https://quickdraw.withgoogle.com/'},
];

// DeepSeek
export async function askDeepSeek(key,question){
  const res=await fetch('https://api.deepseek.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'deepseek-llm-7b',messages:[{role:'user',content:question}],max_tokens:200})});
  if(!res.ok) throw new Error(res.statusText);
  const data=await res.json();
  return data.choices[0].message.content.trim();
}

