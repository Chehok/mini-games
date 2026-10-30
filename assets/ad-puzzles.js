/* Shared HUD, progress and cancellable feedback. Existing <game>.level keys stay intact. */
(function () {
  'use strict';
  const symbols=['●','▲','■','◆','★','✚','♥','⬟','☀','≋'];
  window.AdPuzzle = function (key, maxLevel) {
    const $=id=>document.getElementById(id),saved=Number(MG.store.get(key+'.level',1));
    let level=Number.isFinite(saved)?Math.max(1,Math.min(maxLevel||9999,Math.floor(saved))):1;
    let reached=Math.max(level,Number(MG.store.get(key+'.unlocked',level))||1),moves=0,over=false,start,epoch=0;
    let sound=false; // Sound always starts OFF; never unlock audio without an explicit gesture.
    const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settings=document.createElement('div');settings.className='puzzle-settings';
    const label=document.createElement('label');label.textContent='단계 선택 ';
    const select=document.createElement('select');select.setAttribute('aria-label','플레이할 단계');label.appendChild(select);settings.appendChild(label);
    const audio=document.createElement('button');audio.className='btn sound-toggle';audio.type='button';audio.textContent='소리 꺼짐';audio.setAttribute('aria-pressed','false');settings.appendChild(audio);
    $('instructions').before(settings);
    const track=document.createElement('div');track.className='level-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');track.appendChild(fill);settings.after(track);
    audio.onclick=()=>{sound=!sound;audio.textContent=sound?'소리 켜짐':'소리 꺼짐';audio.setAttribute('aria-pressed',String(sound));if(sound){MG.unlockAudio();MG.beep(660,70,.045);}};
    select.onchange=()=>{level=Number(select.value);reset();};
    function options(){
      select.replaceChildren();const count=maxLevel||Math.min(9999,reached+1);
      for(let i=1;i<=count;i++){const opt=document.createElement('option');opt.value=i;opt.textContent=i+'단계';select.appendChild(opt);}select.value=level;
      fill.style.width=(maxLevel?((level-1)/maxLevel*100):Math.min(100,level/Math.max(10,reached)*100))+'%';
    }
    function feedback(kind){
      MG.vibrate(kind==='win'?[18,45,24]:kind==='error'?20:8);
      if(sound)MG.beep(kind==='win'?1047:kind==='error'?220:660,kind==='win'?160:55,.045);
    }
    function celebrate(){
      $('board').classList.add('solved');
      if(motion())return;
      const layer=document.createElement('div');layer.className='puzzle-confetti';layer.setAttribute('aria-hidden','true');$('board').appendChild(layer);
      for(let i=0;i<32;i++){
        const p=document.createElement('i');p.style.setProperty('--x',(i*37%100)+'%');p.style.setProperty('--drift',((i%7-3)*24)+'px');p.style.setProperty('--turn',(i%2?1:-1)*540+'deg');p.style.setProperty('--delay',(i%8)*.045+'s');p.style.background=['#8b7aff','#ffcf55','#37cdb0','#ff8fa3'][i%4];layer.appendChild(p);
      }
      const run=epoch;setTimeout(()=>{if(run===epoch)layer.remove();},2000);
    }
    const api={
      $,symbols,motion,
      get epoch(){return epoch;},get level(){return level;},get over(){return over;},get moves(){return moves;},
      say(text){if($('status').textContent!==text)$('status').textContent=text;},
      feedback,
      move(){ $('moves').textContent=++moves;feedback('move'); },
      async animate(el,frames,options){
        if(motion()||!el.animate)return;
        const animation=el.animate(frames,{duration:400,easing:'cubic-bezier(.2,.7,.2,1)',...options});
        try{await animation.finished;}catch(e){/* A reset may detach an animated element. */}
        animation.cancel();
      },
      win(){
        if(over)return;over=true;reached=Math.max(reached,Math.min(maxLevel||9999,level+1));MG.store.set(key+'.unlocked',reached);
        $('next').disabled=false;$('next').textContent=maxLevel&&level===maxLevel?'처음 단계로':'다음 단계';
        $('extras').querySelectorAll('button').forEach(b=>{b.disabled=true;});
        feedback('win');celebrate();options();fill.style.width=(maxLevel?level/maxLevel*100:100)+'%';
        api.say('🎉 성공했어요! '+(maxLevel&&level===maxLevel?'모든 단계를 완성했어요.':'다음 단계에 도전해 보세요.'));$('next').focus();
      },
      fail(text){if(over)return;over=true;feedback('error');$('board').classList.add('failed');api.say(text+' 다시 하기로 도전해 보세요.');$('restart').focus();},
      button(text,fn,parent,label){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=text;if(label)b.setAttribute('aria-label',label);b.addEventListener('click',fn);(parent||$('extras')).appendChild(b);return b;},
      mount(fn){start=fn;reset();}
    };
    function reset(){
      epoch++;moves=0;over=false;$('moves').textContent=0;$('level').textContent=level+(maxLevel?' / '+maxLevel:'');
      $('next').disabled=true;$('next').textContent='다음 단계';$('status').textContent='';
      $('board').classList.remove('solved','failed');$('board').replaceChildren();$('extras').replaceChildren();
      MG.store.set(key+'.level',level);options();start();
    }
    $('restart').onclick=reset;
    $('next').onclick=()=>{if(!over||$('next').disabled)return;level=maxLevel&&level===maxLevel?1:Math.min(9999,level+1);reset();$('restart').focus();};
    return api;
  };
})();
