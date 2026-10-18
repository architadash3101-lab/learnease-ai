# LearnEase AI 🌏♿

**An AI & machine learning learning companion for school students with dyslexia, dyscalculia and ADHD — aligned with UN SDG 4 (Quality Education).**

LearnEase AI adapts lessons to each student, gives adaptive practice, and warns teachers and parents **early** when a student starts falling behind. Main customer: **inclusive schools**; also parents, NGOs and CSR programmes.

> ⚠️ **All student data in this app is synthetic** and generated deterministically in the browser.
> The tutor runs on a **built-in mock LLM** (dictionary + rule simplifier) in demo mode — a real LLM API can be plugged in later. No backend, no API keys, no tracking.

---

## ✨ Features

### 📚 Lesson Support — Tutor Agent
- Paste any lesson → simplified, step-by-step version
- Support modes: **dyslexia, ADHD, dyscalculia**
- Key words with plain-language meanings
- **Read aloud with word-by-word highlighting** (`speechSynthesis` boundary events + graceful fallback)
- **Translation to Hindi and Telugu** (demo glossary)
- **Readability score** (Flesch) before and after simplification
- Adjustable font size, line spacing, **high-contrast mode**, dyslexia-friendly letter spacing

### 🎯 Adaptive Quiz — Quiz Master Agent
- 54-question bank across 7 topics × 3 difficulty levels
- **Ability estimate (Elo/IRT-style) updating after every answer**, with a confidence band
- Next question chosen by an **Upper-Confidence-Band (bandit) rule** — the reason is always shown
- Hints, retries, instant feedback, session summary
- Charts: ability over time + accuracy by topic

### 🧠 Learning-Gap Detection — Gap Detector Agent (real ML)
- Synthetic dataset of **3,200 students** (avg score, trend, time/question, retries, completion, days inactive)
- Models **trained in your browser**: logistic regression, small neural network (6-unit MLP), decision tree
- Model comparison: accuracy, precision, recall, F1, confusion matrix, **ROC curve + AUC**
- **Training progress bar + loss curve**, with a **Retrain** button
- Per-student **risk score & status: On track / Watch / Needs support**

### 🔍 Explainable AI
- Per-student **SHAP-style factor contribution bars**
- **What-if sliders** that update the risk live
- Plain-language explanation of every prediction

### 👥 Student Clustering
- **k-means** learning profiles (k = 2–5) with a scatter plot
- **Named profiles** with a suggested teaching strategy for each

### 📈 Progress Forecasting
- Forecast of each student's **next 4 quiz scores** (damped trend + mean reversion) with a line chart

### 🤖 Multi-Agent System (5 agents)
| Agent | What it does |
|---|---|
| 📚 **Tutor** | Simplifies lessons, key words, read-aloud, translation |
| 🎯 **Quiz Master** | Adaptive quizzes, ability estimate, question selection |
| 🧠 **Gap Detector** | Trains models, scores risk, explains predictions |
| ⏰ **Reminder** | Personalised study plan + WhatsApp/email-style reminder preview |
| 🔔 **Teacher Alert** | Short, kind, actionable alerts for teachers and parents, with a copy button |

- **Agent activity timeline** showing which agent did what and why

### 🏫 Teacher Dashboard
- Sample class of 30 students (synthetic)
- Summary cards, **sortable + filterable risk table**, sparklines, student detail panel
- **Download class report as CSV**

### 🌍 Responsible AI & Impact
- Privacy by design, **fairness check across learner groups** (recall / false-negative rate), human-in-the-loop notice, limitations
- **SDG 4 impact indicators** (clearly marked as estimates)

### 💼 Business View
- Customers: schools (main), parents, NGOs & CSR programmes
- Revenue: school licences, parent freemium plan, NGO/CSR partnerships

---

## 🚀 Run it

No build step, no dependencies, works offline.

```bash
# option 1 — just open it
open index.html            # or double-click it

# option 2 — local server (recommended for read-aloud on some browsers)
python3 -m http.server 8000
# → http://localhost:8000
```

Deploy on **GitHub Pages**: push this folder to a repo, enable Pages on the main branch — done (`.nojekyll` is included).

---

## 🗂 Project structure

```
learease-ai/
├── index.html          # single-page app (7 sections)
├── css/style.css       # themes: high-contrast, dyslexia spacing
├── js/
│   ├── utils.js        # seeded RNG (mulberry32), helpers
│   ├── data.js         # synthetic data generator (3,200 students), sample lesson
│   ├── ml.js           # logistic regression, MLP, decision tree, k-means, metrics, ROC/AUC
│   ├── charts.js       # Canvas charts: line, bars, gauge, confusion, ROC, scatter, sparkline
│   ├── tutor.js        # simplifier, dictionary, readability, read-aloud, translation
│   ├── quiz.js         # question bank, Elo ability model, UCB question selection
│   ├── agents.js       # 5-agent system + activity timeline + messages
│   ├── ui_*.js         # per-section UI wiring
│   └── app.js          # bootstrap
├── LICENSE             # MIT
└── .nojekyll
```

---

## 🔌 Plugging in a real LLM later

The tutor currently calls the mock LLM in `js/tutor.js` (`simplifyPass`, `translate`). To connect a real API,
replace those two functions with fetch calls to your endpoint — the UI does not change. No keys are needed for the demo.

---

## ⚖️ Ethics

- Risk scores are **screening estimates, never diagnoses** — every alert asks the teacher to pair the signal with their own judgement.
- All data is **synthetic**; a production deployment would follow data-minimisation and parent-consent rules (e.g. India's DPDP Act).
- Impact indicators on the *Responsible AI* tab are **clearly marked as estimates**.

## 📄 License

MIT — see [LICENSE](LICENSE).
