(() => {
  const body = document.body;
  const threshold = document.getElementById('threshold');
  const enterSound = document.getElementById('enterSound');
  const enterSilent = document.getElementById('enterSilent');
  const soundToggle = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');
  const siteHeader = document.getElementById('siteHeader');
  const heroSealWrap = document.querySelector('.hero__seal-wrap');
  const utcTime = document.getElementById('utcTime');
  const footerUtc = document.getElementById('footerUtc');
  const noticeDialog = document.getElementById('noticeDialog');
  const noticeDialogContent = document.getElementById('noticeDialogContent');
  const noticeClose = document.getElementById('noticeClose');

  const notices = {
    '2026-04': {
      code: 'NOTICE 2026-04 / 22 AUG 2026',
      title: 'International Security Coordination Update',
      text: 'Authorized international coordination activity related to a transnational security matter has concluded. No additional action is required of the public at this time. Operational details, participating authorities and technical information are not subject to public release.'
    },
    '2026-03': {
      code: 'NOTICE 2026-03 / 03 MAY 2026',
      title: 'Advisory Concerning Fraudulent Federation Representation',
      text: 'The Federation does not conduct public recruitment, solicit funds, authorize commercial representation, or permit private persons to act on behalf of operational personnel. Any such claim should be regarded as fraudulent and reported to the competent national authority.'
    },
    '2026-01': {
      code: 'NOTICE 2026-01 / 14 JAN 2026',
      title: 'Public Information Portal',
      text: 'This website constitutes the designated public information portal of the International Federation for Combating Terrorism unless an alternative channel is identified through an authorized Federation notice. The absence of information from this portal should not be interpreted as confirmation or denial of operational activity.'
    }
  };

  function updateUTC() {
    const now = new Date();
    const t = now.toLocaleTimeString('en-GB', {timeZone:'UTC',hour12:false});
    const d = now.toLocaleDateString('en-GB', {timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
    utcTime.textContent = `UTC ${t}`;
    footerUtc.textContent = `${d} / UTC ${t}`;
  }
  updateUTC();
  setInterval(updateUTC, 1000);

  function enterSite(withSound) {
    threshold.classList.add('is-gone');
    body.classList.remove('is-locked');
    setTimeout(() => threshold.setAttribute('hidden',''), 1200);
    if (withSound) audio.start();
    window.scrollTo({top:0,behavior:'instant'});
  }
  enterSound.addEventListener('click', () => enterSite(true));
  enterSilent.addEventListener('click', () => enterSite(false));

  navToggle.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  primaryNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    primaryNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded','false');
  }));

  addEventListener('scroll', () => {
    siteHeader.classList.toggle('scrolled', scrollY > 24);
  }, {passive:true});

  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    addEventListener('pointermove', (e) => {
      if (!heroSealWrap) return;
      const x = (e.clientX / innerWidth - .5) * 7;
      const y = (e.clientY / innerHeight - .5) * 7;
      heroSealWrap.style.transform = `translate3d(${x}px,${y}px,0)`;
    }, {passive:true});
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
  }, {threshold:.12, rootMargin:'0px 0px -7% 0px'});
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  document.querySelectorAll('.notice__open').forEach(btn => btn.addEventListener('click', () => {
    const item = notices[btn.dataset.notice];
    noticeDialogContent.innerHTML = `<div class="dialog-code">${item.code}</div><h3>${item.title}</h3><p>${item.text}</p><p class="dialog-code">Issued under Federation authority.</p>`;
    noticeDialog.showModal();
    audio.setZone('quiet');
  }));
  noticeClose.addEventListener('click', () => { noticeDialog.close(); audio.setZone('normal'); });
  noticeDialog.addEventListener('click', (e) => {
    if (e.target === noticeDialog) { noticeDialog.close(); audio.setZone('normal'); }
  });

  // --- Procedural soundscape: low drone + remote harmonic/choral field + generated reverb.
  // No external audio files or tracking calls are used.
  const audio = {
    ctx: null, master: null, droneBus: null, choirBus: null, reverb: null,
    nodes: [], timer: null, active: false, zone: 'normal',
    async start() {
      if (this.active) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      await this.ctx.resume();
      const ctx = this.ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(ctx.destination);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -30;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = .08;
      compressor.release.value = .9;
      compressor.connect(this.master);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.makeImpulse(5.8, 2.3);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = .23;
      this.reverb.connect(reverbGain).connect(compressor);

      this.droneBus = ctx.createGain();
      this.choirBus = ctx.createGain();
      this.droneBus.gain.value = .09;
      this.choirBus.gain.value = .032;
      this.droneBus.connect(compressor);
      this.droneBus.connect(this.reverb);
      this.choirBus.connect(this.reverb);
      this.choirBus.connect(compressor);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      filter.Q.value = .4;
      filter.connect(this.droneBus);

      [55, 82.41, 110].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 1 ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.detune.value = [-5, 3, -2][i];
        g.gain.value = [0.08,0.035,0.018][i];
        o.connect(g).connect(filter); o.start(); this.nodes.push(o,g);
      });

      // Breath-like amplitude drift.
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = .055;
      lfoGain.gain.value = .012;
      lfo.connect(lfoGain).connect(this.droneBus.gain);
      lfo.start(); this.nodes.push(lfo,lfoGain);

      // Remote vowel-like harmonic clusters. Soft, unresolved, never rhythmic.
      [146.83, 220, 293.66].forEach((f, i) => {
        const o = ctx.createOscillator();
        const formant = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f; o.detune.value = [-8,4,9][i];
        formant.type = 'bandpass'; formant.frequency.value = [520,760,980][i]; formant.Q.value = .8;
        g.gain.value = [0.018,0.012,0.008][i];
        o.connect(formant).connect(g).connect(this.choirBus); o.start(); this.nodes.push(o,formant,g);
      });

      this.active = true;
      soundToggle.setAttribute('aria-pressed','true');
      soundLabel.textContent = 'Sound on';
      this.master.gain.exponentialRampToValueAtTime(.42, ctx.currentTime + 3.8);
      this.scheduleRareTone();
    },
    makeImpulse(seconds, decay) {
      const rate = this.ctx.sampleRate;
      const length = rate * seconds;
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let ch=0; ch<2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i=0;i<length;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/length, decay);
      }
      return impulse;
    },
    scheduleRareTone() {
      clearTimeout(this.timer);
      const delay = 28000 + Math.random()*42000;
      this.timer = setTimeout(() => {
        if (this.active && this.ctx && this.zone !== 'quiet') this.rareTone();
        this.scheduleRareTone();
      }, delay);
    },
    rareTone() {
      const ctx=this.ctx, o=ctx.createOscillator(), g=ctx.createGain(), p=ctx.createStereoPanner();
      o.type='sine'; o.frequency.value=[174.61,196,233.08,261.63][Math.floor(Math.random()*4)];
      p.pan.value=(Math.random()*1.2)-.6;
      const t=ctx.currentTime;
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.018,t+2.8);
      g.gain.exponentialRampToValueAtTime(.0001,t+8.5);
      o.connect(g).connect(p).connect(this.reverb);
      o.start(t); o.stop(t+9);
    },
    stop() {
      if (!this.active || !this.ctx) return;
      const t=this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.exponentialRampToValueAtTime(.0001,t+.8);
      setTimeout(() => { if(this.ctx){ this.ctx.suspend(); } }, 900);
      this.active=false;
      soundToggle.setAttribute('aria-pressed','false');
      soundLabel.textContent='Sound off';
    },
    async resume() {
      if (!this.ctx) return this.start();
      await this.ctx.resume();
      const t=this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(.0001,t);
      this.master.gain.exponentialRampToValueAtTime(.42,t+1.2);
      this.active=true;
      soundToggle.setAttribute('aria-pressed','true');
      soundLabel.textContent='Sound on';
    },
    setZone(zone) {
      this.zone=zone;
      if (!this.ctx || !this.active) return;
      const t=this.ctx.currentTime;
      const choirTarget = zone==='quiet' ? .004 : .032;
      const droneTarget = zone==='quiet' ? .055 : .09;
      this.choirBus.gain.cancelScheduledValues(t);
      this.droneBus.gain.cancelScheduledValues(t);
      this.choirBus.gain.linearRampToValueAtTime(choirTarget,t+1.4);
      this.droneBus.gain.linearRampToValueAtTime(droneTarget,t+1.4);
    }
  };

  soundToggle.addEventListener('click', () => audio.active ? audio.stop() : audio.resume());

  // Public Notices are intentionally acoustically sparse.
  const noticesSection = document.getElementById('notices');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > .42) audio.setZone('quiet');
      else if (!e.isIntersecting && audio.zone === 'quiet' && !noticeDialog.open) audio.setZone('normal');
    });
  }, {threshold:[.42]});
  sectionObserver.observe(noticesSection);
})();
