(function(){
  'use strict';
  if(window.__aivAssistantLoaded)return;
  window.__aivAssistantLoaded=true;
  var script=document.currentScript;
  var name=script.dataset.company||'AiVenture';
  var avatar=script.dataset.avatar||'';
  var api=script.dataset.api||'';
  var key=script.dataset.siteKey||'';
  var contact=script.dataset.contact||'/contact/';
  var accent=script.dataset.accent||'#eac34d';
  var isTax=/ECB/i.test(name);
  var faqs=isTax?[
    [/servici|contabil|tax|fiscal|salar|hr|cfo/i,'ECB Tax oferă contabilitate, salarizare, consultanță fiscală și CFO part-time. Consultați catalogul serviciilor pentru detalii: /servicii/'],
    [/preț|pret|cost|tarif|ofert/i,'Tariful depinde de complexitate și volumul activității. Puteți solicita o ofertă prin pagina Contact.'],
    [/program|discu|contact|telefon|apel/i,'Puteți programa o discuție sau trimite o solicitare prin pagina Contact.']
  ]:[
    [/geo|seo|aeo|aio|vizibil|google/i,'AiVenture oferă servicii SEO, GEO, AEO și AIO pentru vizibilitatea oamenilor și a sistemelor AI.'],
    [/a2a|agent|automat/i,'Web-A2A pregătește serviciile pentru descoperire și interacțiuni între agenți AI, cu control uman.'],
    [/ai act|dora|nis2|rrvi/i,'AiVenture oferă soluții pentru documentare și verificare de la distanță, inclusiv RRVI™.'],
    [/preț|pret|cost|ofert/i,'Prețurile orientative sunt publicate pe site; o ofertă exactă se stabilește după evaluarea serviciului.']
  ];
  var css='#aiv-assistant-root{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147482000;font-family:Arial,sans-serif;color:#f3f3f3}#aiv-assistant-root *{box-sizing:border-box}#aiv-assistant-launch{position:relative;width:76px;height:76px;border-radius:50%;border:3px solid '+accent+';background:#101010;box-shadow:0 8px 35px #0008;cursor:pointer;padding:3px;display:block;overflow:hidden}#aiv-assistant-launch img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center 22%;animation:aivFloat 2.7s ease-in-out infinite}#aiv-assistant-launch .aiv-fallback{display:grid;place-items:center;width:100%;height:100%;font-size:30px;color:'+accent+'}#aiv-assistant-launch:focus-visible,.aiv-assistant-send:focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes aivFloat{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.065) rotate(2deg)}}@media(prefers-reduced-motion:reduce){#aiv-assistant-launch img{animation:none}}#aiv-assistant-panel{display:none;flex-direction:column;position:absolute;right:0;bottom:90px;width:min(365px,calc(100vw - 28px));height:min(510px,calc(100dvh - 145px));border:1px solid #63552b;background:#101010;color:white;box-shadow:0 18px 60px #000b;border-radius:18px;overflow:hidden}#aiv-assistant-panel[data-open=true]{display:flex}.aiv-assistant-head{padding:15px;background:#1a1a1a;border-bottom:1px solid #444;display:flex;align-items:center;justify-content:space-between;gap:12px}.aiv-assistant-head strong{font-size:15px}.aiv-assistant-head small{display:block;font-size:11px;color:#c2c2c2;margin-top:3px}.aiv-assistant-close{border:0;background:transparent;color:white;font-size:26px;cursor:pointer}.aiv-assistant-messages{padding:15px;overflow-y:auto;flex:1;font-size:14px;line-height:1.5}.aiv-assistant-msg{max-width:92%;padding:10px 12px;border-radius:12px;margin:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere;background:#292929}.aiv-assistant-msg.user{background:#66521c;margin-left:auto}.aiv-assistant-footer{padding:10px;border-top:1px solid #3e3e3e}.aiv-assistant-form{display:flex;gap:7px}.aiv-assistant-input{min-width:0;flex:1;padding:11px;border-radius:8px;border:1px solid #555;background:#181818;color:white;font-size:14px}.aiv-assistant-send{border:0;background:'+accent+';color:#111;border-radius:8px;padding:0 12px;font-weight:700;cursor:pointer}.aiv-assistant-note{font-size:10px;color:#aaa;margin-top:7px}.aiv-assistant-note a{color:'+accent+'}';
  var style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  var root=document.createElement('div');root.id='aiv-assistant-root';
  var launch=document.createElement('button');launch.id='aiv-assistant-launch';launch.type='button';launch.setAttribute('aria-label','Deschide asistentul virtual AI');launch.setAttribute('aria-expanded','false');
  if(avatar){var img=document.createElement('img');img.src=avatar;img.alt='Avatar asistent virtual';img.loading='lazy';img.onerror=function(){img.replaceWith(document.createTextNode('AI'))};launch.appendChild(img)}else{var fallback=document.createElement('span');fallback.className='aiv-fallback';fallback.textContent='AI';launch.appendChild(fallback)}
  var panel=document.createElement('section');panel.id='aiv-assistant-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Asistent virtual '+name);panel.dataset.open='false';
  panel.innerHTML='<div class="aiv-assistant-head"><div><strong>Asistent virtual · '+(isTax?'ECB Tax':'AiVenture')+'</strong><small>Informații generale · nu înlocuiește un specialist</small></div><button type="button" class="aiv-assistant-close" aria-label="Închide asistentul">×</button></div><div class="aiv-assistant-messages" aria-live="polite"></div><div class="aiv-assistant-footer"><form class="aiv-assistant-form"><input class="aiv-assistant-input" type="text" maxlength="600" autocomplete="off" placeholder="Scrieți întrebarea..." aria-label="Întrebarea dumneavoastră" required><button class="aiv-assistant-send" type="submit">Trimite</button></form><div class="aiv-assistant-note">Nu introduceți CNP, date fiscale sau informații confidențiale. <a href="'+contact+'">Contact uman</a></div></div>';
  root.appendChild(panel);root.appendChild(launch);document.body.appendChild(root);
  var messages=panel.querySelector('.aiv-assistant-messages'),input=panel.querySelector('input'),form=panel.querySelector('form'),submit=panel.querySelector('.aiv-assistant-send');
  function add(s,who){var d=document.createElement('div');d.className='aiv-assistant-msg'+(who==='user'?' user':'');d.textContent=s;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;return d}
  add('Bună ziua! Sunt asistentul virtual '+name+'. Vă pot orienta către serviciile noastre. Cu ce vă pot ajuta?');
  function toggle(on){panel.dataset.open=String(on);launch.setAttribute('aria-expanded',String(on));if(on)input.focus()}
  launch.addEventListener('click',function(){toggle(panel.dataset.open!=='true')});
  panel.querySelector('.aiv-assistant-close').addEventListener('click',function(){toggle(false);launch.focus()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&panel.dataset.open==='true')toggle(false)});
  function localAnswer(s){for(var i=0;i<faqs.length;i++)if(faqs[i][0].test(s))return faqs[i][1];return 'Nu am un răspuns verificat pentru această întrebare. Vă recomand să contactați echipa prin '+contact+'.'}
  form.addEventListener('submit',async function(e){e.preventDefault();var q=input.value.trim();if(!q)return;input.value='';add(q,'user');submit.disabled=true;
    if(api&&key){try{var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort()},10000);var res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site_key:key,message:q}),signal:ctrl.signal});clearTimeout(timer);if(res.ok){var data=await res.json();var answer=data.answer||data.reply||data.message;if(typeof answer==='string'&&answer.trim()){add(answer.slice(0,3000));submit.disabled=false;return}}}catch(err){}}
    add(localAnswer(q));submit.disabled=false;
  });
})();
