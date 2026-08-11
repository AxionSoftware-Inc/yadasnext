'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import sourceData from '../data/questions-1-80.json';

const letters = ['A', 'B', 'C', 'D'];
const storeKey = 'yadas-study-v2';

const emptyState = () => ({ answered: {}, correct: 0, attempts: 0, sessions: 0 });

function correctSet(question) {
  const raw = Array.isArray(question?.correct_answer)
    ? question.correct_answer
    : question?.correct_answer
      ? [question.correct_answer]
      : [];

  return new Set(raw.map((value) => String(value).trim().toUpperCase()).filter((value) => letters.includes(value)));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function typeset(elements) {
  if (typeof window === 'undefined' || !window.MathJax?.typesetPromise) return;
  window.MathJax.typesetPromise(elements.filter(Boolean)).catch(() => {});
}

export default function Home() {
  const data = sourceData;
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [count, setCount] = useState('10');
  const [status, setStatus] = useState('all');
  const [state, setState] = useState(emptyState);
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [currentAnswered, setCurrentAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [screen, setScreen] = useState('empty');
  const questionRef = useRef(null);
  const optionsRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storeKey) || '{}');
      setState({
        ...emptyState(),
        ...saved,
        answered: saved && typeof saved.answered === 'object' && saved.answered ? saved.answered : {},
      });
    } catch {
      setState(emptyState());
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storeKey, JSON.stringify(state));
    } catch {
      // Private browsing or blocked storage should not prevent testing.
    }
  }, [state]);

  const topics = useMemo(
    () => [{ id: 'all', title: 'Barcha mavzular', count: data.questions.length }, ...(data.topics || [])],
    [data]
  );

  const currentQuestion = deck[index];
  const currentCorrect = currentQuestion ? correctSet(currentQuestion) : new Set();

  useEffect(() => {
    if (screen === 'play') {
      const timer = window.setTimeout(() => typeset([questionRef.current, optionsRef.current]), 0);
      return () => window.clearTimeout(timer);
    }
  }, [screen, index, currentQuestion]);

  function start() {
    let pool = data.questions.filter((question) => selectedTopic === 'all' || question.topic === selectedTopic);

    if (status === 'answered') pool = pool.filter((question) => correctSet(question).size > 0);
    if (status === 'unseen') pool = pool.filter((question) => !state.answered[question.id]);
    if (status === 'wrong') pool = pool.filter((question) => state.answered[question.id]?.correct === false);

    const shuffled = shuffle(pool);
    const amount = count === 'all' ? shuffled.length : Math.max(0, Number(count) || 0);
    const nextDeck = shuffled.slice(0, amount);

    setDeck(nextDeck);
    setIndex(0);
    setScore(0);
    setSessionAttempts(0);
    setCurrentAnswered(false);
    setSelectedAnswer(null);
    setFeedback(null);

    if (!nextDeck.length) {
      setScreen('empty');
      return;
    }

    setScreen('play');
    setState((previous) => ({ ...previous, sessions: previous.sessions + 1 }));
  }

  function answer(choice) {
    if (!currentQuestion || currentAnswered) return;

    setCurrentAnswered(true);
    setSelectedAnswer(choice);
    const good = currentCorrect.size > 0 && currentCorrect.has(choice);

    if (!currentCorrect.size) {
      setFeedback({ type: 'bad', html: 'Bu savol tekshiruv talab qiladi.<br>JSONda ishonchli javob kaliti yo‘q. U statistika va “xato qilinganlar” ro‘yxatiga qo‘shilmaydi.' });
      return;
    }

    setSessionAttempts((value) => value + 1);
    setScore((value) => value + (good ? 1 : 0));
    setState((previous) => ({
      ...previous,
      correct: previous.correct + (good ? 1 : 0),
      attempts: previous.attempts + 1,
      answered: {
        ...previous.answered,
        [currentQuestion.id]: { correct: good, at: Date.now() },
      },
    }));
    setFeedback({
      type: good ? 'good' : 'bad',
      html: good
        ? '<strong>To‘g‘ri.</strong> Davom etamiz.'
        : `<strong>Bu safar xato.</strong> To‘g‘ri javob: ${[...currentCorrect].join(', ')}.`,
    });
  }

  function next() {
    if (index < deck.length - 1) {
      setIndex((value) => value + 1);
      setCurrentAnswered(false);
      setSelectedAnswer(null);
      setFeedback(null);
      return;
    }
    setScreen('summary');
  }

  function resetStats() {
    if (window.confirm('Saqlangan natijalar tozalansinmi?')) setState(emptyState());
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (screen !== 'play') return;
      const key = event.key.toUpperCase();
      if (letters.includes(key) && !currentAnswered) answer(key);
      if (event.key === 'Enter' && currentAnswered) next();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const answeredCount = Object.values(state.answered || {}).length;
  const accuracy = state.attempts ? `${Math.round((state.correct / state.attempts) * 100)}%` : '—';
  const progress = deck.length ? ((index + (currentAnswered ? 1 : 0)) / deck.length) * 100 : 0;
  const skipped = deck.length - sessionAttempts;

  return (
    <main className="shell">
      <header className="top">
        <div>
          <div className="eyebrow">YaDas · 1–80-sahifalar</div>
          <h1>Mavzu tanla. Ishla. Qayta takrorla.</h1>
          <p className="lead">Integrallarni alohida, differensial tenglamalarni alohida yoki hammasini aralashtirib test qil. Har bir sessiya savollarni qayta aralashtiradi.</p>
        </div>
        <div className="badge">{data.questions.length} ta savol</div>
      </header>

      <section className="layout">
        <aside className="panel">
          <h2>Test sozlamalari</h2>
          <label htmlFor="count">Sessiyada nechta savol?</label>
          <select id="count" value={count} onChange={(event) => setCount(event.target.value)}>
            <option value="5">5 ta</option>
            <option value="10">10 ta</option>
            <option value="20">20 ta</option>
            <option value="all">Tanlanganlarning hammasi</option>
          </select>

          <label htmlFor="status">Savol turi</label>
          <select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Barcha savollar</option>
            <option value="answered">Javobi bor savollar</option>
            <option value="unseen">Avval ishlanmaganlar</option>
            <option value="wrong">Oldin xato qilinganlar</option>
          </select>

          <label>Mavzu</label>
          <div className="topic-list">
            {topics.map((topic) => (
              <button key={topic.id} className={`topic-chip ${topic.id === selectedTopic ? 'active' : ''}`} onClick={() => setSelectedTopic(topic.id)}>
                <span>{topic.title}</span><span>{topic.count}</span>
              </button>
            ))}
          </div>

          <button type="button" className="primary" onClick={start}>Testni boshlash</button>
          <button type="button" className="ghost" onClick={resetStats}>Natijalarni tozalash</button>
          <div className="stats">
            <div className="stat"><strong>{answeredCount}</strong><small>ishlangan</small></div>
            <div className="stat"><strong>{accuracy}</strong><small>aniqlik</small></div>
            <div className="stat"><strong>{state.sessions}</strong><small>sessiya</small></div>
          </div>
          <p className="fine">Javoblar faqat shu brauzerda saqlanadi. Manbada javobi noaniq savollar natijaga qo‘shilmaydi.</p>
        </aside>

        <section className="quiz">
          {screen === 'empty' && (
            <div className="empty">
              <div><div className="eyebrow">Boshlashga tayyor</div><h2>{data.questions.length ? 'Chapdan mavzuni tanlang' : 'Savollar yuklanmadi'}</h2><p>{data.questions.length ? 'Masalan, faqat “Integrallar va Furye qatorlari”ni tanlab, 10 ta savol ishlang.' : 'Savollar JSON fayli topilmadi.'}</p></div>
            </div>
          )}

          {screen === 'play' && currentQuestion && (
            <div id="play">
              <div className="quiz-head"><span>{index + 1} / {deck.length}</span><span>{score} to‘g‘ri</span></div>
              <div className="progress"><i style={{ width: `${progress}%` }} /></div>
              <div className="topic-tag">{currentQuestion.topic_title || currentQuestion.topic || 'Mavzu'}</div>
              <div className="question" ref={questionRef}>{currentQuestion.question || 'Savol matni yo‘q'}</div>
              <div className="options" ref={optionsRef}>
                {letters.map((letter) => {
                  const isCorrect = currentCorrect.has(letter);
                  const isWrong = currentAnswered && letter === selectedAnswer && !isCorrect;
                  return (
                    <button key={letter} type="button" className={`option ${currentAnswered && isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} disabled={currentAnswered} onClick={() => answer(letter)}>
                      <b>{letter}</b><span>{currentQuestion.options?.[letter] ?? '—'}</span>
                    </button>
                  );
                })}
              </div>
              {feedback && <div className={`feedback show ${feedback.type}`} dangerouslySetInnerHTML={{ __html: feedback.html }} />}
              {currentAnswered && <button type="button" className="primary next" onClick={next}>Keyingi savol →</button>}
            </div>
          )}

          {screen === 'summary' && (
            <div className="summary show">
              <div className="eyebrow">Sessiya tugadi</div>
              <h2>{sessionAttempts ? `${score} / ${sessionAttempts} — ${Math.round((score / sessionAttempts) * 100)}%` : 'Tekshiriladigan javoblar yo‘q'}</h2>
              <p>{selectedTopic === 'all' ? 'Istasangiz yana aralashtirib ishlang yoki bitta mavzuni tanlang.' : 'Shu bo‘limni yana ishlasangiz, xato qilingan savollarni alohida filtrlab takrorlashingiz mumkin.'}{skipped > 0 ? ` ${skipped} ta savolda ishonchli javob kaliti bo‘lmagani uchun foizga qo‘shilmadi.` : ''}</p>
              <button type="button" className="primary" onClick={start}>Yana shu mavzuni ishlash</button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
