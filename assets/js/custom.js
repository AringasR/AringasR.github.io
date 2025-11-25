// assets/js/custom.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedback-form');   // antroji forma
  const out  = document.getElementById('form-result');     // rezultato blokas po forma
  if (!form || !out) return;

  // ---------- Pagalbinės ----------
  const nameRe  = /^[\p{L}\s\-']+$/u;                    // LT raidės, tarpai, - ir ’
  const mailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;      // paprastas el. pašto patikrinimas
  const addrRe  = /^[\p{L}0-9\s\.,\-\/#’']+$/u;          // NEW: adresui leidžiami ženklai

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];

  // ----- Telef. formatavimas + lygus caret išsaugojimas -----
  const phoneInput = form.querySelector('input[name="phone"]');

  // grąžina tik skaitmenis
  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

  // kiek SKAITMENŲ yra kairėje nuo caret
  const digitsLeft = (text, pos) => text.slice(0, pos).replace(/\D/g, '').length;

  // skaitmenų indeksą → caret pozicija suformatuotame tekste
  const caretFromDigitIndex = (formatted, digitIdx) => {
    if (digitIdx <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        seen++;
        if (seen === digitIdx) return i + 1;
      }
    }
    return formatted.length;
  };

  // sudeda tarpus į +370 6xx xxxxx; leidžia pildyti palaipsniui
  function formatFromDigits(d) {
    let digits = onlyDigits(d);

    // 8xxxxxxxx -> 370xxxxxxxx ; 00.. -> be 00
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('8'))  digits = '370' + digits.slice(1);
    if (!digits.startsWith('370')) digits = '370' + digits;  // garantuojam šalies kodą

    // ribojam iki 11 skaitmenų (3706 + 7)
    digits = digits.slice(0, 11);

    // konstruojam vaizdą: +370 6xx xxxxx
    let out = '+370';
    if (digits.length > 3) out += ' ' + digits[3];          // " 6"
    if (digits.length > 4) out += digits.slice(4, 6);       // "xx"
    if (digits.length > 6) out += ' ' + digits.slice(6);    // " xxxxx"
    return out;
  }

  // ar tel. validus: 3706 + 7 sk.
  const isPhoneValid = (text) => {
    const d = onlyDigits(text);
    return d.startsWith('3706') && d.length === 11;
  };

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      const oldVal = phoneInput.value;
      const oldPos = phoneInput.selectionStart || 0;
      const before = digitsLeft(oldVal, oldPos);               // kiek skaitmenų buvo kairėje

      const newVal = formatFromDigits(oldVal);
      phoneInput.value = newVal;

      const newCaret = caretFromDigitIndex(newVal, before);    // atstatom žymeklį
      try { phoneInput.setSelectionRange(newCaret, newCaret); } catch (_) {}

      validate();
    });

    phoneInput.addEventListener('blur', () => {
      phoneInput.value = formatFromDigits(phoneInput.value);
      validate();
    });

    // filtruojam įvedimą: leidžiam skaitmenis, + pradžioje ir navigacijos klavišus
    phoneInput.addEventListener('keydown', (e) => {
      const nav = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
      if (nav.includes(e.key)) return;
      if (/\d/.test(e.key)) return;
      if (e.key === '+' && (phoneInput.selectionStart || 0) === 0) return;
      e.preventDefault();
    });
  }

  // ---------- Gyva validacija ----------
  const fName = form.querySelector('input[name="firstName"]');
  const lName = form.querySelector('input[name="lastName"]');
  const email = form.querySelector('input[name="email"]');
  const addr  = form.querySelector('input[name="address"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  const setError = (inp, msg) => {
    inp.classList.add('is-invalid');
    inp.setAttribute('aria-invalid', 'true');
    let help = inp.nextElementSibling;
    if (!help || !help.classList.contains('error-msg')) {
      help = document.createElement('small');
      help.className = 'error-msg';
      inp.insertAdjacentElement('afterend', help);
    }
    help.textContent = msg;
  };
  const clearError = (inp) => {
    inp.classList.remove('is-invalid');
    inp.removeAttribute('aria-invalid');
    const help = inp.nextElementSibling;
    if (help && help.classList.contains('error-msg')) help.remove();
  };

  // NEW: adreso įvedimo „filteris“ su kursoriumi vietoje
  if (addr) {
    addr.addEventListener('input', () => {
      const pos = addr.selectionStart ?? addr.value.length;
      // paliekam tik leidžiamus simbolius
      const cleaned = addr.value.replace(/[^ \p{L}0-9\.,\-\/#’']/gu, '');
      if (cleaned !== addr.value) {
        const diff = addr.value.length - cleaned.length;
        addr.value = cleaned;
        try { addr.setSelectionRange(pos - diff, pos - diff); } catch(_) {}
      }
      validate();
    });
  }

  function validate() {
    let ok = true;

    if (!fName.value.trim() || !nameRe.test(fName.value.trim())) {
      setError(fName, 'Įveskite tik raides (gali būti tarpai, - arba ’).');
      ok = false;
    } else clearError(fName);

    if (!lName.value.trim() || !nameRe.test(lName.value.trim())) {
      setError(lName, 'Įveskite tik raides (gali būti tarpai, - arba ’).');
      ok = false;
    } else clearError(lName);

    if (!email.value.trim() || !mailRe.test(email.value.trim())) {
      setError(email, 'Neteisingas el. pašto formatas (pvz., vardas@domain.lt).');
      ok = false;
    } else clearError(email);

    // NEW: adreso validacija — ilgis ≥3 ir tik leidžiami ženklai
    const a = addr.value.trim();
    if (a.length < 3 || !addrRe.test(a)) {
      setError(addr, 'Adresas gali turėti raides, skaičius, tarpus ir . , - / # (be ! @ $ % ir pan.).');
      ok = false;
    } else clearError(addr);

    if (!isPhoneValid(phoneInput.value)) {
      setError(phoneInput, 'Formatas: +370 6xx xxxxx.');
      ok = false;
    } else clearError(phoneInput);

    // trys klausimai
    ['q1','q2','q3'].forEach(name => {
      if (!form.querySelector(`input[name="${name}"]:checked`)) ok = false;
    });

    if (submitBtn) submitBtn.disabled = !ok;
    return ok;
  }

  // prisekam įvykius
  qsa('input[type="text"],input[type="email"],input[type="tel"]', form).forEach(el => {
    el.addEventListener('input', validate);
    el.addEventListener('blur',  validate);
  });
  qsa('input[type="radio"]', form).forEach(r => r.addEventListener('change', validate));
  validate(); // pradinė būklė

  // ---------- Pop-up ----------
  function showSuccessPopup(text = 'Duomenys pateikti sėkmingai!') {
    let box = document.getElementById('pop-ok');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pop-ok';
      box.style.cssText =
        'position:fixed;left:50%;top:20px;transform:translateX(-50%);' +
        'background:#2ecc71;color:#fff;padding:10px 16px;border-radius:10px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.25);font-weight:600;z-index:9999;' +
        'opacity:0;transition:opacity .25s ease';
      document.body.appendChild(box);
    }
    box.textContent = text;
    requestAnimationFrame(() => box.style.opacity = '1');
    setTimeout(() => box.style.opacity = '0', 2000);
  }

  // ---------- Pateikimas (vidurkis + rezultatai) ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form).entries());

    // 1–10 normalizavimas
    ['q1','q2','q3'].forEach(k => {
      const v = Number(data[k]);
      data[k] = Math.min(10, Math.max(1, isNaN(v) ? 1 : v));
    });

    const q1 = Number(data.q1 || 0);
    const q2 = Number(data.q2 || 0);
    const q3 = Number(data.q3 || 0);
    const avgStr = ((q1 + q2 + q3) / 3).toFixed(1);

    console.clear();
    console.log('Antros formos duomenys:', data);

    const mail = (data.email || '').trim();
    const tel  = phoneInput.value; // jau gražiai suformatuotas

    out.innerHTML = `
      <div style="background:#f3f2ec;border-radius:8px;padding:12px 16px;line-height:1.45">
        <p><em>Vardas:</em> ${data.firstName || ''}</p>
        <p><em>Pavardė:</em> ${data.lastName || ''}</p>
        <p><em>El. paštas:</em> ${mail ? `<a href="mailto:${mail}">${mail}</a>` : ''}</p>
        <p><em>Tel. Numeris:</em> ${tel}</p>
        ${data.address ? `<p><em>Adresas:</em> ${data.address}</p>` : ''}

        <hr style="border:none;border-top:1px solid #dddcd2;margin:.4rem 0;">
        <p><em>UI/UX:</em> ${data.q1}</p>
        <p><em>Kodo kokybė:</em> ${data.q2}</p>
        <p><em>Bendravimas:</em> ${data.q3}</p>

        <p style="margin-top:.4rem">
          <strong>${data.firstName || ''} ${data.lastName || ''}: vidurkis ${avgStr}</strong>
        </p>
      </div>
    `;

    showSuccessPopup('Duomenys pateikti sėkmingai!');
  });
});
