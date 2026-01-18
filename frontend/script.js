// --- GLOBAL VARIABLES ---
let currentQuestions = [];
let userAnswers = {};
let currentQuestionIndex = 0;
let currentTestType = 'mcq';
let timerInterval;

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = window.config?.SUPABASE_URL || 'https://fcmgjnoqfqtvavjoxaqb.supabase.co';
const SUPABASE_ANON_KEY = window.config?.SUPABASE_ANON_KEY || '';

let supabaseClient;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase SDK not loaded. Check your internet connection or ad blocker.");
    alert("Critical Error: Supabase SDK failed to load. Please refresh the page.");
    // Mock to prevent crash on subsequent calls
    supabaseClient = {
        auth: {
            getUser: async () => ({ data: { user: null } }),
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => { },
            signInWithPassword: async () => ({ error: { message: "Supabase not loaded" } }),
            signUp: async () => ({ error: { message: "Supabase not loaded" } }),
            signOut: async () => ({ error: { message: "Supabase not loaded" } })
        },
        from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }) })
    };
}

// --- NAVIGATION ---
function navigateTo(pageId) {
    document.querySelectorAll('main').forEach(el => el.classList.add('hidden'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.remove('hidden');
    window.scrollTo(0, 0);

    const navbar = document.getElementById('navbar');
    if (pageId === 'test' || pageId === 'result') {
        navbar.classList.add('hidden');
    } else {
        navbar.classList.remove('hidden');
    }

    if (pageId !== 'test' && pageId !== 'result') {
        updateAuthUI(); // Update UI based on auth state whenever we navigate
        const activeLink = document.getElementById('nav-' + pageId);
        if (activeLink) activeLink.style.color = 'var(--primary)';

        if (pageId === 'dashboard') {
            fetchUserTests();
        }
    }
}

// --- AUTH LOGIC ---
async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        alert('Login successful!');
        navigateTo('dashboard');
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const fullName = e.target.querySelector('input[type="text"]').value;

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName }
            }
        });
        if (error) throw error;
        alert('Signup successful! Please check your email for verification (if enabled) or log in.');
        navigateTo('login');
    } catch (error) {
        alert('Error signing up: ' + error.message);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        navigateTo('home');
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

function updateAuthUI() {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const publicNav = document.getElementById('nav-links-public');
        const publicBtns = document.getElementById('nav-buttons-public');
        const authNav = document.getElementById('nav-links-auth');
        const authBtns = document.getElementById('nav-buttons-auth');

        if (session) {
            publicNav.classList.add('hidden');
            publicBtns.classList.add('hidden');
            authNav.classList.remove('hidden');
            authBtns.classList.remove('hidden');

            // Initial color set for auth links
            const authLinks = ['nav-home', 'nav-dashboard', 'nav-create'];
            authLinks.forEach(linkId => {
                const link = document.getElementById(linkId);
                if (link) link.style.color = 'var(--text-main)';
            });

            // Update user email display
            const userEmailDisplay = authBtns.querySelector('span');
            if (userEmailDisplay) userEmailDisplay.innerText = session.user.email;

        } else {
            publicNav.classList.remove('hidden');
            publicBtns.classList.remove('hidden');
            authNav.classList.add('hidden');
            authBtns.classList.add('hidden');
        }
    });
}

// Initialize Auth Listener
supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI();
});

// Check execution
console.log("Supabase Script Loaded");
function updateSlider(val) { document.getElementById('slider-value').innerText = val; }
function switchTab(e, tabId) { e.preventDefault(); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); e.target.closest('.tab-btn').classList.add('active'); if (tabId === 'upload') { document.getElementById('tab-upload').classList.remove('hidden'); document.getElementById('tab-paste').classList.add('hidden'); } else { document.getElementById('tab-upload').classList.add('hidden'); document.getElementById('tab-paste').classList.remove('hidden'); } }
function scrollToSection(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

// --- AI LOGIC ---
function createPrompt(text, numQuestions, type, difficulty) {
    let typeInstruction = type === 'mcq' ? "Multiple Choice Questions (MCQ)" : (type === 'fib' ? "Fill in the Blanks" : "One-Word Answer Questions");
    let jsonFormat = type === 'mcq'
        ? `[{"question": "Q?", "options": ["A", "B", "C", "D"], "answer": 0}] (answer is index 0-3)`
        : `[{"question": "Q?", "answer": "word"}]`;

    return `Create a practice test based ONLY on this text: "${text.substring(0, 3000)}". Generate ${numQuestions} questions. Type: ${typeInstruction}. Difficulty: ${difficulty}. Output strictly as a JSON array format: ${jsonFormat}. No markdown.`;
}

async function fetchQuestionsFromAI(userText, apiKey, numQuestions, type, difficulty) {
    const modelName = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: createPrompt(userText, numQuestions, type, difficulty) }] }] })
    });
    if (!response.ok) throw new Error((await response.json()).error.message);
    const data = await response.json();
    let content = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content.substring(content.indexOf('['), content.lastIndexOf(']') + 1));
}

// --- DATABASE & DASHBOARD ---
async function saveTestToDB(questions, title, type) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return; // Don't save if not logged in (guest mode)

        const { error } = await supabaseClient.from('tests').insert({
            user_id: user.id,
            title: title,
            questions: questions,
            type: type,
            score: null // Score is null until taken
        });

        if (error) throw error;
        console.log('Test saved to DB');
    } catch (err) {
        console.error('Error saving test:', err);
    }
}

async function fetchUserTests() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: tests, error } = await supabaseClient
            .from('tests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderDashboard(tests);
    } catch (err) {
        console.error('Error fetching tests:', err);
    }
}

function renderDashboard(tests) {
    const container = document.querySelector('.grid.grid-cols-3'); // Stats container
    const emptyState = document.querySelector('.empty-state');
    const dashboardContainer = document.querySelector('#page-dashboard .container');

    // Check if we already have a tests list container, if not create one
    let testsList = document.getElementById('tests-list-container');
    if (!testsList) {
        testsList = document.createElement('div');
        testsList.id = 'tests-list-container';
        testsList.className = 'grid grid-cols-3 gap-6'; // Re-use grid layout
        // Insert after stats
        if (container) container.parentNode.insertBefore(testsList, emptyState);
    }

    // Update Stats
    if (container) {
        const totalTests = tests.length;
        const attempts = tests.filter(t => t.score !== null).length;
        // Calculate avg score logic could go here if we saved max score properly

        container.querySelectorAll('.stat-card').forEach((card, i) => {
            const valDiv = card.querySelector('.font-bold.text-xl');
            if (i === 0) valDiv.innerText = totalTests;
            if (i === 1) valDiv.innerText = attempts;
            // if (i === 2) valDiv.innerText = "0%"; // Placeholder for now
        });
    }

    if (tests.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        testsList.innerHTML = '';
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        testsList.innerHTML = '';

        tests.forEach(test => {
            const date = new Date(test.created_at).toLocaleDateString();
            const card = `
                <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <span class="text-xs text-gray-400">${date}</span>
                    </div>
                    <h3 class="font-bold text-lg mb-2">${test.title}</h3>
                    <p class="text-sm text-gray-500 mb-4">${test.type.toUpperCase()} • ${test.questions.length} Questions</p>
                    <button class="btn btn-outline w-full" onclick='startTest(${JSON.stringify(test.questions)}, "${test.title}", "${test.type}")'>Take Test</button>
                </div>
            `;
            testsList.innerHTML += card;
        });
    }
}

// --- MODIFIED EXECUTION FLOW ---

async function handleGenerateClick() {
    const textInput = document.querySelector('#tab-paste textarea').value;
    const numQuestions = document.getElementById('test-slider').value;
    const type = document.getElementById('test-type').value;
    const difficulty = document.getElementById('test-difficulty').value;
    const title = document.getElementById('test-title').value || "Practice Test";

    // NOTE: In a real app, do not expose API keys in frontend code.
    const apiKey = window.config?.GEMINI_API_KEY || "";

    if (!textInput || textInput.length < 50) return alert("Please paste at least 50 characters of notes.");

    const btn = document.querySelector('#page-create .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = `Generating...`; btn.disabled = true;

    try {
        const questions = await fetchQuestionsFromAI(textInput, apiKey, numQuestions, type, difficulty);

        // SAVE TO DB HERE
        await saveTestToDB(questions, title, type);

        startTest(questions, title, type);
    } catch (error) {
        console.error(error); alert("Error: " + error.message);
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

// --- TEST ENGINE ---
function startTest(questions, title, type) {
    currentQuestions = questions;
    currentQuestionIndex = 0;
    currentTestType = type;
    userAnswers = {};

    document.getElementById('display-test-title').innerText = title;
    updateQuestionUI();

    startTimer(questions.length * 1); // 1 minute per question
    navigateTo('test');
}

function startTimer(minutes) {
    let time = minutes * 60;
    const timerDisplay = document.getElementById('test-timer');
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const m = Math.floor(time / 60);
        let s = time % 60;
        s = s < 10 ? '0' + s : s;
        timerDisplay.innerText = `${m}:${s}`;
        time--;

        if (time < 0) {
            clearInterval(timerInterval);
            alert("Time's up! Submitting test...");
            finishTest();
        }
    }, 1000);
}

function updateQuestionUI() {
    if (currentQuestions.length === 0) return;
    const q = currentQuestions[currentQuestionIndex];

    document.getElementById('q-text').innerText = q.question;
    document.getElementById('q-number').innerText = currentQuestionIndex + 1;
    document.getElementById('q-total').innerText = currentQuestions.length;

    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';

    if (currentTestType === 'mcq') {
        q.options.forEach((opt, index) => {
            const isSelected = userAnswers[currentQuestionIndex] === index ? 'selected' : '';
            optionsList.innerHTML += `
                        <div class="option-card ${isSelected}" onclick="handleOptionSelect(${index})">
                            <div class="option-circle"></div><span>${opt}</span>
                        </div>`;
        });
    } else {
        const savedAnswer = userAnswers[currentQuestionIndex] || '';
        optionsList.innerHTML = `<input type="text" class="test-text-input" placeholder="Type answer..." value="${savedAnswer}" oninput="handleTextInput(this.value)">`;
    }

    // Logic for "Next" vs "Finish" button
    // Logic for "Next" vs "Finish" button
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
        if (currentQuestionIndex === currentQuestions.length - 1) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-flex';
        }
    }

    // Logic for Previous button
    const prevBtn = document.getElementById('btn-prev');
    if (prevBtn) {
        prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'inline-flex';
    }

    // Update Sidebar Palette
    // Update Sidebar Palette
    const palette = document.getElementById('palette-container');
    palette.innerHTML = '';
    let answeredCount = 0;

    // Calculate total answered count across all questions
    // Note: userAnswers might look like {0:1, 2:3}
    answeredCount = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== "").length;

    currentQuestions.forEach((_, idx) => {
        let statusClass = '';
        if (idx === currentQuestionIndex) statusClass = 'current';
        else if (userAnswers[idx] !== undefined && userAnswers[idx] !== "") statusClass = 'answered';
        palette.innerHTML += `<button class="palette-btn ${statusClass}" onclick="jumpToQuestion(${idx})">${idx + 1}</button>`;
    });

    const notAnsweredCount = currentQuestions.length - answeredCount;
    document.getElementById('count-answered').innerText = answeredCount;
    document.getElementById('count-not-answered').innerText = notAnsweredCount;
}

function handleOptionSelect(idx) { userAnswers[currentQuestionIndex] = idx; updateQuestionUI(); }
function handleTextInput(val) { userAnswers[currentQuestionIndex] = val; }

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuestionUI();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuestionUI();
    }
}

function jumpToQuestion(idx) {
    currentQuestionIndex = idx;
    updateQuestionUI();
}

function finishTest() {
    clearInterval(timerInterval);

    let score = 0;
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = '';

    currentQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        let isCorrect = false;
        let displayUserAns = "";
        let displayCorrectAns = "";

        if (currentTestType === 'mcq') {
            // Use loose equality to handle index mismatch (string vs number)
            isCorrect = (userAns == q.answer);
            displayUserAns = userAns !== undefined ? q.options[userAns] : "Not Answered";
            displayCorrectAns = q.options[q.answer];
        } else {
            const safeAns = userAns ? String(userAns).toLowerCase().trim() : "";
            const safeCorrect = String(q.answer).toLowerCase().trim();
            isCorrect = (safeAns === safeCorrect);
            displayUserAns = userAns || "Not Answered";
            displayCorrectAns = q.answer;
        }

        if (isCorrect) score++;

        const badgeClass = isCorrect ? 'badge-correct' : 'badge-wrong';
        const badgeText = isCorrect ? 'Correct' : 'Incorrect';

        reviewContainer.innerHTML += `
                    <div class="review-item">
                        <div class="review-badge ${badgeClass}">
                            ${isCorrect ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'}
                            ${badgeText}
                        </div>
                        <div class="review-question">${idx + 1}. ${q.question}</div>
                        <div class="review-answer">
                            <span class="text-sub">Your Answer:</span> 
                            <span class="${isCorrect ? 'text-green' : 'text-red'}">${displayUserAns}</span>
                        </div>
                        ${!isCorrect ? `<div class="review-answer"><span class="text-sub">Correct Answer:</span> <span class="text-green">${displayCorrectAns}</span></div>` : ''}
                    </div>
                `;
    });

    const percentage = Math.round((score / currentQuestions.length) * 100);

    // Update Stats
    document.getElementById('result-score').innerText = `${score}/${currentQuestions.length}`;
    document.getElementById('result-correct').innerText = score;
    document.getElementById('result-wrong').innerText = currentQuestions.length - score;

    // Update Circular Chart
    document.getElementById('result-percentage-text').innerText = `${percentage}%`;
    const circle = document.querySelector('.circular-chart .circle');

    // Dynamic Color
    let color = '#ef4444'; // Red default (Low)
    if (percentage >= 80) color = '#10b981'; // Green (High)
    else if (percentage >= 50) color = '#f59e0b'; // Orange (Medium)

    circle.style.stroke = color;

    // stroke-dasharray: current, total (100)
    // We set it to 0 initially in CSS, now we update it to animate
    setTimeout(() => {
        circle.setAttribute('stroke-dasharray', `${percentage}, 100`);
    }, 100);

    let msg = "";
    let title = "Test Completed!";
    if (percentage >= 80) { msg = "Outstanding! You've mastered this topic."; title = "Excellent Work! 🎉"; }
    else if (percentage >= 50) { msg = "Good effort! Review the mistakes below."; title = "Well Done!"; }
    else { msg = "Keep practicing. Don't give up!"; title = "Keep Going!"; }

    document.getElementById('result-message').innerText = msg;
    document.getElementById('result-title').innerText = title;



    navigateTo('result');

    // Trigger Confetti if good score
    if (percentage >= 50) triggerConfetti();
}

function triggerConfetti() {
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.opacity = Math.random();

        document.body.appendChild(confetti);

        // Remove after animation
        setTimeout(() => confetti.remove(), 4000);
    }
}