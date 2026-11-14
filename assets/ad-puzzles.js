/* Shared HUD, progress, challenge rules and cancellable feedback.
   Existing <game>.level / .unlocked keys stay intact.
   Challenge rules (2026-11-13):
   - Each game has its own 5 hearts. A failed or abandoned attempt costs one; one comes back every 20 minutes.
   - A game may set a goal (par / move limit). Stars: 3 at or under par, 2 in the first half of the slack, else 1.
     Every mistake costs a star, and using a helper caps the result at 2 stars.
   - Difficulty tiers by level: 쉬움 1–5, 보통 6–20, 어려움 21+, and every 10th level is a 보스 단계. */
(function () {
  'use strict';
  const symbols=['●','▲','■','◆','★','✚','♥','⬟','☀','≋'];
  const MAX_HEARTS=5,REGEN_MS=20*60*1000;
  function tier(level){
    if(level%10===0)return {key:'boss',name:'보스',slack:p=>Math.max(1,Math.ceil(p*.1))};
    if(level<=5)return {key:'easy',name:'쉬움',slack:p=>Math.ceil(p)+2};
    if(level<=20)return {key:'normal',name:'보통',slack:p=>Math.ceil(p*.5)+1};
    return {key:'hard',name:'어려움',slack:p=>Math.ceil(p*.25)+1};
  }
  function starText(n){return '★'.repeat(n)+'☆'.repeat(3-n);}
  window.AdPuzzle = function (key, maxLevel) {
    const $=id=>document.getElementById(id),saved=Number(MG.store.get(key+'.level',1));
    let level=Number.isFinite(saved)?Math.max(1,Math.min(maxLevel||9999,Math.floor(saved))):1;
    const unlocked=Number(MG.store.get(key+'.unlocked',level));
    let reached=Math.max(level,Number.isFinite(unlocked)?Math.max(1,Math.min(maxLevel||9999,Math.floor(unlocked))):level),moves=0,over=false,start,epoch=0;
    let goal=null,mistakes=0,helped=false,blocked=false,ticker=0;
    let sound=false,hintBanner,hintText,hintNext; // Sound always starts OFF; never unlock audio without an explicit gesture.
    const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settings=document.createElement('div');settings.className='puzzle-settings';
    const label=document.createElement('label');label.textContent='단계 ';
    const select=document.createElement('select');select.setAttribute('aria-label','플레이할 단계');label.appendChild(select);settings.appendChild(label);
    const heartBox=document.createElement('span');heartBox.className='heart-meter';heartBox.setAttribute('role','status');settings.appendChild(heartBox);
    const audio=document.createElement('button');audio.className='btn sound-toggle';audio.type='button';audio.textContent='🔇';audio.setAttribute('aria-label','소리 꺼짐');audio.setAttribute('aria-pressed','false');settings.appendChild(audio);
    $('instructions').before(settings);
    const track=document.createElement('div');track.className='level-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');track.appendChild(fill);settings.after(track);
    const goalLine=document.createElement('p');goalLine.className='puzzle-goal';goalLine.hidden=true;track.after(goalLine);
    audio.onclick=()=>{sound=!sound;audio.textContent=sound?'🔊':'🔇';audio.setAttribute('aria-label',sound?'소리 켜짐':'소리 꺼짐');audio.setAttribute('aria-pressed',String(sound));if(sound){MG.unlockAudio();MG.beep(660,70,.045);}};
    select.onchange=()=>{const next=Number(select.value);abandon();level=next;reset();};

    /* ---------- hearts ---------- */
    function hearts(){
      const now=Date.now();let h=MG.store.get(key+'.hearts',null);
      if(!h||!Number.isFinite(h.n)||!Number.isFinite(h.t))h={n:MAX_HEARTS,t:now};
      h={n:Math.max(0,Math.min(MAX_HEARTS,Math.floor(h.n))),t:Math.min(now,h.t)};
      if(h.n>=MAX_HEARTS)h.t=now;
      else{const gained=Math.floor((now-h.t)/REGEN_MS);if(gained>0){h.n=Math.min(MAX_HEARTS,h.n+gained);h.t=h.n>=MAX_HEARTS?now:h.t+gained*REGEN_MS;}}
      MG.store.set(key+'.hearts',h);return h;
    }
    function nextHeartIn(h){return h.n>=MAX_HEARTS?0:Math.max(0,REGEN_MS-(Date.now()-h.t));}
    function clock(ms){const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
    function drawHearts(){
      const h=hearts(),wait=nextHeartIn(h);
      heartBox.textContent='❤️ '+h.n+(h.n<MAX_HEARTS?' · '+clock(wait):'');
      heartBox.setAttribute('aria-label','하트 '+h.n+'개 남음'+(h.n<MAX_HEARTS?', '+clock(wait)+' 뒤 1개 회복':''));
      heartBox.classList.toggle('empty',h.n===0);
      return h;
    }
    function loseHeart(){
      const h=hearts();if(h.n>=MAX_HEARTS)h.t=Date.now();h.n=Math.max(0,h.n-1);MG.store.set(key+'.hearts',h);drawHearts();return h.n;
    }
    function tick(){
      const h=drawHearts();
      if(blocked&&h.n>0){blocked=false;reset();return;}
      if(blocked){const t=$('board').querySelector('.heart-gate-time');if(t)t.textContent=clock(nextHeartIn(h))+' 뒤에 하트 1개가 차요.';}
    }
    function gate(){
      blocked=true;over=true;
      const box=document.createElement('div');box.className='heart-gate';box.setAttribute('role','alert');
      const title=document.createElement('strong');title.textContent='💔 하트를 다 썼어요';box.appendChild(title);
      const time=document.createElement('span');time.className='heart-gate-time';box.appendChild(time);
      const other=document.createElement('a');other.className='btn';other.href='../puzzles/';other.textContent='다른 퍼즐 하러 가기';box.appendChild(other);
      $('board').appendChild(box);$('restart').disabled=true;tick();
    }

    /* ---------- in-progress attempts ---------- */
    function abandon(){
      // Leaving a started, unfinished attempt counts as a failure.
      if(moves>0&&!over&&!blocked){loseHeart();MG.store.set(key+'.attempt',null);return true;}
      return false;
    }
    if(typeof window.addEventListener==='function')window.addEventListener('pagehide',()=>{if(moves>0&&!over&&!blocked)MG.store.set(key+'.attempt',level);});
    const leftover=MG.store.get(key+'.attempt',null);
    if(leftover){MG.store.set(key+'.attempt',null);loseHeart();if(MG.toast)setTimeout(()=>MG.toast('지난 도전을 끝내지 않고 나가서 하트 1개가 줄었어요.'),300);}

    /* ---------- stars ---------- */
    function bestStars(){const s=MG.store.get(key+'.stars',null);return s&&typeof s==='object'?s:{};}
    function options(){
      select.replaceChildren();const count=maxLevel||Math.min(9999,reached+1),best=bestStars();
      for(let i=1;i<=count;i++){const opt=document.createElement('option');opt.value=i;opt.textContent=i+'단계'+(best[i]?' '+starText(best[i]):'');select.appendChild(opt);}select.value=level;
      fill.style.width=(maxLevel?((level-1)/maxLevel*100):Math.min(100,level/Math.max(10,reached)*100))+'%';
    }
    function earnedStars(){
      let s=3;
      if(goal&&goal.par){const half=goal.par+Math.ceil(((goal.limit||goal.par*2)-goal.par)/2);s=moves<=goal.par?3:moves<=half?2:1;}
      if(helped)s=Math.min(s,2);
      return Math.max(1,s-mistakes);
    }
    function drawGoal(){
      if(!goal){goalLine.hidden=true;goalLine.textContent='';return;}
      const t=tier(level),parts=[t.name+(t.key==='boss'?' 단계':'')];
      if(goal.par)parts.push('★3 '+goal.par+'번 이하');
      if(goal.limit)parts.push('최대 '+goal.limit+'번');
      if(goal.note)parts.push(goal.note);
      goalLine.hidden=false;goalLine.dataset.tier=t.key;goalLine.textContent=parts.join(' · ');
    }

    function feedback(kind){
      MG.vibrate(kind==='win'?[18,45,24]:kind==='error'?20:8);
      if(sound)MG.beep(kind==='win'?1047:kind==='error'?220:660,kind==='win'?160:55,.045);
    }
    function celebrate(stars){
      $('board').classList.add('solved');
      {
        const banner=document.createElement('div');banner.className='puzzle-clear';banner.setAttribute('aria-hidden','true');
        const star=document.createElement('span');star.className='clear-stars';star.textContent=starText(stars).split('').join(' ');banner.appendChild(star);
        const title=document.createElement('strong');title.textContent={'pin-pull':'보석 수집 완료!','screw-puzzle':'공구함 정리 완료!','water-sort':'색깔 정리 완료!','parking-jam':'모두 탈출했어요!','untangle':'매듭을 다 풀었어요!'}[key];banner.appendChild(title);
        const note=document.createElement('small');
        note.textContent=stars===3?'완벽해요! 다음 단계도 도전해요.':goal&&goal.par?'별 3개는 '+goal.par+'번 이하'+(helped?', 도움 없이':'')+(mistakes?', 실수 없이':'')+'예요.':'멋지게 해냈어요! 다음 단계도 도전해요.';
        banner.appendChild(note);$('board').appendChild(banner);
      }
      if(motion())return;
      const layer=document.createElement('div');layer.className='puzzle-confetti';layer.setAttribute('aria-hidden','true');$('board').appendChild(layer);
      for(let i=0;i<32;i++){
        const p=document.createElement('i');p.style.setProperty('--x',(i*37%100)+'%');p.style.setProperty('--drift',((i%7-3)*24)+'px');p.style.setProperty('--turn',(i%2?1:-1)*540+'deg');p.style.setProperty('--delay',(i%8)*.045+'s');p.style.background=['#8b7aff','#ffcf55','#37cdb0','#ff8fa3'][i%4];layer.appendChild(p);
      }
      const run=epoch;setTimeout(()=>{if(run===epoch)layer.remove();},2000);
    }
    function restartLabel(){
      const costly=moves>0&&!over&&!blocked;
      $('restart').textContent=costly?'다시 하기 ❤️-1':'다시 하기';
    }
    function end(text){
      over=true;MG.store.set(key+'.attempt',null);feedback('error');$('board').classList.add('failed');restartLabel();
      $('extras').querySelectorAll('button').forEach(b=>{b.disabled=true;});
      const left=hearts().n;
      api.say(text+(left?' 하트가 '+left+'개 남았어요. 다시 하기로 도전해 보세요.':' 하트를 다 썼어요.'));
      if(left){$('restart').focus();}else{setTimeout(()=>{if(over&&!blocked)gate();},900);}
    }
    const api={
      $,symbols,motion,
      get epoch(){return epoch;},get level(){return level;},get over(){return over;},get moves(){return moves;},
      get tier(){return tier(level);},get helped(){return helped;},get mistakes(){return mistakes;},
      say(text){if($('status').textContent!==text)$('status').textContent=text;},
      feedback,
      /* par: moves for 3 stars. limit: optional cap that fails the attempt. Use tier(level).slack for the cap. */
      goal(next){goal=next?{...next}:null;if(goal&&goal.par&&goal.limit===true)goal.limit=goal.par+tier(level).slack(goal.par);drawGoal();return goal;},
      help(){helped=true;},
      /* A mistake costs a heart and a star but the attempt continues while hearts remain. */
      mistake(text){
        if(over)return;mistakes++;const left=loseHeart();
        if(!left){over=true;MG.store.set(key+'.attempt',null);feedback('error');$('board').classList.add('failed');restartLabel();$('extras').querySelectorAll('button').forEach(b=>{b.disabled=true;});api.say(text+' 하트를 다 썼어요.');setTimeout(()=>{if(over&&!blocked)gate();},900);return;}
        feedback('error');api.say(text+' 하트 -1 (남은 하트 '+left+'개)');
      },
      introduce(data,hints){
        if(!hintBanner){
          hintBanner=document.createElement('div');hintBanner.className='mechanic-hint';hintBanner.setAttribute('role','note');
          hintText=document.createElement('span');hintText.className='mechanic-text';hintText.setAttribute('aria-live','polite');hintBanner.appendChild(hintText);
          hintNext=document.createElement('button');hintNext.type='button';hintNext.className='mechanic-next';hintBanner.appendChild(hintNext);$('instructions').after(hintBanner);
        }
        const pending=data.mechanics.filter(m=>hints[m]&&!MG.store.get(key+'.hint.'+m,false));
        function show(){
          const mechanic=pending.shift();hintBanner.hidden=!mechanic;
          hintText.textContent=mechanic?'💡 '+hints[mechanic]:'';
          hintNext.textContent=pending.length?'다음 안내':'알겠어요';
          if(mechanic)MG.store.set(key+'.hint.'+mechanic,true);
        }
        hintNext.onclick=()=>{show();if(hintBanner.hidden)$('restart').focus();};show();
      },
      move(){
        $('moves').textContent=++moves;feedback('move');restartLabel();
        if(goal&&goal.limit){
          const run=epoch;
          // Let the caller check for a win first; the last allowed move may solve the board.
          Promise.resolve().then(()=>{if(run===epoch&&!over&&moves>=goal.limit)api.fail('이동 '+goal.limit+'번을 다 썼어요.');});
        }
      },
      async animate(el,frames,options){
        if(motion()||!el.animate)return;
        const animation=el.animate(frames,{duration:400,easing:'cubic-bezier(.2,.7,.2,1)',...options});
        try{await animation.finished;}catch(e){/* A reset may detach an animated element. */}
        animation.cancel();
      },
      win(){
        if(over)return;over=true;MG.store.set(key+'.attempt',null);reached=Math.max(reached,Math.min(maxLevel||9999,level+1));MG.store.set(key+'.unlocked',reached);
        const stars=earnedStars(),best=bestStars();if(!best[level]||best[level]<stars){best[level]=stars;MG.store.set(key+'.stars',best);}
        $('next').disabled=false;$('next').textContent=maxLevel&&level===maxLevel?'처음 단계로':'다음 단계';restartLabel();
        $('extras').querySelectorAll('button').forEach(b=>{b.disabled=true;});
        feedback('win');celebrate(stars);options();fill.style.width=(maxLevel?level/maxLevel*100:100)+'%';
        api.say('🎉 성공! 별 '+stars+'개 · '+(maxLevel&&level===maxLevel?'모든 단계를 완성했어요.':'다음 단계에 도전해 보세요.'));$('next').focus();
      },
      fail(text){if(over)return;loseHeart();end(text);},
      button(text,fn,parent,label){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=text;if(label)b.setAttribute('aria-label',label);b.addEventListener('click',fn);(parent||$('extras')).appendChild(b);return b;},
      mount(fn){start=fn;reset();}
    };
    function reset(){
      epoch++;moves=0;over=false;goal=null;mistakes=0;helped=false;blocked=false;MG.store.set(key+'.attempt',null);
      $('moves').textContent=0;$('level').textContent=level+(maxLevel?' / '+maxLevel:'');
      $('next').disabled=true;$('next').textContent='다음 단계';$('restart').disabled=false;$('status').textContent='';
      $('board').classList.remove('solved','failed');$('board').replaceChildren();$('extras').replaceChildren();
      MG.store.set(key+'.level',level);MG.store.set(key+'.unlocked',reached);options();drawGoal();
      const h=drawHearts();restartLabel();
      start();drawGoal();
      if(!h.n)gate();
    }
    $('restart').onclick=()=>{if(blocked)return;abandon();reset();};
    $('next').onclick=()=>{if(!over||$('next').disabled)return;level=maxLevel&&level===maxLevel?1:Math.min(9999,level+1);reset();$('restart').focus();};
    if(typeof setInterval==='function')ticker=setInterval(tick,1000);
    return api;
  };
  window.AdPuzzle.tier=tier;
  window.AdPuzzle.MAX_HEARTS=MAX_HEARTS;
  window.AdPuzzle.REGEN_MS=REGEN_MS;
})();
