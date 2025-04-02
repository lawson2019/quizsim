// @ts-nocheck
class QuizApp {
    constructor() {
        this.questions = [];
        this.allQuestions = [];
        this.currentQuestionIndex = 0;
        this.answers = new Map();
        this.stats = {
            correct: 0,
            wrong: 0,
            total: 0
        };
        this.questionTypes = ['言语理解', '资料分析', '图形推理'];
        this.questionsPerType = 10;
        this.timePerQuestion = 60; // 单位:秒
        this.currentQuestionTimer = null;
        this.remainingTime = this.timePerQuestion;
        this.isPracticeMode = true;
        this.isRandomOrder = false;
        this.serverPort = 3000; // 默认端口
        this.markedQuestions = new Set();
        this.shortcuts = {
            'm': () => this.toggleMarkQuestion()
        };

        this.initializeElements();
        this.initializeEventListeners();
        this.updateUI();

        // 检测服务器端口并初始化
        this.detectServerPort().then(() => {
            // 只加载test.md文件
            this.loadQuestions('test.md');
            this.watchQuestions('test.md');
        }).catch(error => {
            console.error("无法连接到服务器:", error);
            this.questionElement.innerHTML = `
                <div class="error-message">
                    <h3>无法连接到服务器</h3>
                    <p>请确保服务器正在运行，并刷新页面重试。</p>
                    <p>错误信息: ${error.message}</p>
                </div>
            `;
        });
    }

    async detectServerPort() {
        try {
            const response = await fetch(`http://localhost:${this.serverPort}/server-info`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.serverPort = data.port || this.serverPort;
                console.log(`已连接到服务器端口: ${this.serverPort}`);
                return;
            }
        } catch (error) {
            console.log(`默认端口 ${this.serverPort} 连接失败，尝试检测其他端口...`);
        }

        const maxPort = this.serverPort + 10;
        for (let port = this.serverPort + 1; port <= maxPort; port++) {
            try {
                const response = await fetch(`http://localhost:${port}/server-info`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.serverPort = data.port || port;
                    console.log(`已连接到服务器端口: ${this.serverPort}`);
                    return;
                }
            } catch (error) {
                console.log(`端口 ${port} 连接失败`);
            }
        }

        throw new Error(`无法找到可用的服务器端口 (${this.serverPort}-${maxPort})`);
    }

    initializeElements() {
        this.questionElement = document.getElementById('question');
        this.optionsElement = document.getElementById('options');
        this.answerElement = document.getElementById('answer');
        this.correctAnswerElement = document.getElementById('correctAnswer');
        this.explanationElement = document.getElementById('explanation');
        this.questionNumberElement = document.getElementById('questionNumber');

        this.navToggleBtn = document.getElementById('navToggleBtn');
        this.questionNav = document.querySelector('.question-nav');
        this.questionNavList = document.getElementById('questionNav');

        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.questionOrderSelect = document.getElementById('questionOrderSelect');

        this.modeToggleBtn = document.getElementById('modeToggleBtn');
        this.checkAnswerBtn = document.getElementById('checkAnswer');
        this.submitTestBtn = document.getElementById('submitTest');

        this.timerDisplay = document.getElementById('timerDisplay');
        this.timeSpentElement = document.getElementById('timeSpent');

        this.progressElement = document.getElementById('progressFill');
        this.correctCountElement = document.getElementById('correctCount');
        this.wrongCountElement = document.getElementById('wrongCount');
        this.accuracyElement = document.getElementById('accuracy');
        this.completionElement = document.getElementById('completion');
        this.questionTypeElement = document.getElementById('questionType');

        this.resultsPanel = document.getElementById('resultsPanel');
        this.totalQuestionsElement = document.getElementById('totalQuestions');
        this.totalCorrectElement = document.getElementById('totalCorrect');
        this.totalWrongElement = document.getElementById('totalWrong');
        this.finalAccuracyElement = document.getElementById('finalAccuracy');
        this.totalTimeElement = document.getElementById('totalTime');
        this.wrongQuestionsListElement = document.getElementById('wrongQuestionsList');
        this.correctQuestionsListElement = document.getElementById('correctQuestionsList');

        this.markedCountElement = document.getElementById('markedCount');
        this.markQuestionBtn = document.getElementById('markQuestion');

        this.helpBtn = document.getElementById('helpBtn');
        this.helpPanel = document.getElementById('helpPanel');

        this.updateModeDisplay();

        this.settingsPanel.classList.add('hidden');

        this.resultsPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.resultsPanel.classList.remove('visible');
            this.resultsPanel.classList.add('hidden');
        });
    }

    initializeEventListeners() {
        document.getElementById('prevBtn').addEventListener('click', () => this.previousQuestion());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        this.checkAnswerBtn.addEventListener('click', () => this.toggleAnswer());
        this.submitTestBtn.addEventListener('click', () => this.submitTest());
        this.optionsElement.addEventListener('click', (e) => this.handleOptionClick(e));
        this.modeToggleBtn.addEventListener('click', () => this.toggleMode());

        this.settingsBtn.addEventListener('click', () => this.toggleSettingsPanel());
        this.settingsPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.settingsPanel.classList.remove('visible');
            this.settingsPanel.classList.add('hidden');
        });

        this.questionOrderSelect.addEventListener('change', () => {
            this.isRandomOrder = this.questionOrderSelect.value === 'random';
            this.resetQuiz();
        });

        this.navToggleBtn.addEventListener('click', () => this.toggleQuestionNav());
        this.questionNav.querySelector('.close-btn').addEventListener('click', () => {
            this.questionNav.classList.remove('visible');
            this.questionNav.classList.add('hidden');
        });

        document.getElementById('typeFilter').addEventListener('change', (e) => {
            const selectedType = e.target.value;
            const categories = document.querySelectorAll('.question-category');

            categories.forEach(category => {
                if (selectedType === 'all' || category.querySelector('h4').textContent === selectedType) {
                    category.classList.remove('hidden');
                } else {
                    category.classList.add('hidden');
                }
            });
        });

        this.markQuestionBtn.addEventListener('click', () => this.toggleMarkQuestion());

        // 添加帮助按钮点击事件
        this.helpBtn.addEventListener('click', () => {
            this.helpPanel.classList.remove('hidden');
            this.helpPanel.classList.add('visible');
        });

        this.helpPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.helpPanel.classList.remove('visible');
            this.helpPanel.classList.add('hidden');
        });

        // 添加键盘快捷键监听
        document.addEventListener('keydown', (e) => {
            // 只在非输入框状态下响应快捷键
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                const handler = this.shortcuts[e.key.toLowerCase()];
                if (handler) {
                    e.preventDefault();
                    handler();
                }
            }
        });
    }

    toggleQuestionNav() {
        const isHidden = this.questionNav.classList.contains('hidden');
        if (isHidden) {
            this.questionNav.classList.remove('hidden');
            this.questionNav.classList.add('visible');
        } else {
            this.questionNav.classList.remove('visible');
            this.questionNav.classList.add('hidden');
        }
    }

    updateQuestionNav() {
        if (!this.isPracticeMode) {
            this.questionNav.classList.add('hidden');
            this.navToggleBtn.classList.add('hidden');
            return;
        }

        this.navToggleBtn.classList.remove('hidden');

        const questionsByType = {};
        this.questions.forEach((q, index) => {
            const type = this.detectQuestionType(q);
            if (!questionsByType[type]) {
                questionsByType[type] = [];
            }
            questionsByType[type].push({ question: q, index });
        });

        this.questionNavList.innerHTML = Object.entries(questionsByType)
            .map(([type, questions]) => {
                const questionLinks = questions.map(({ question, index }) => {
                    const isAnswered = this.answers.has(index);
                    const isCorrect = isAnswered && this.answers.get(index) === question.answer;
                    const isCurrent = index === this.currentQuestionIndex;
                    const isMarked = this.markedQuestions.has(index);

                    return `
                        <div class="nav-item ${isCurrent ? 'active' : ''} 
                                             ${isAnswered ? (isCorrect ? 'answered' : 'wrong') : ''} 
                                             ${isMarked ? 'marked' : ''}"
                             data-index="${index}">
                            <span class="nav-number">${index + 1}</span>
                            ${isMarked ? '<i class="fas fa-bookmark"></i>' : ''}
                            ${isAnswered ? `<i class="fas ${isCorrect ? 'fa-check text-success' : 'fa-times text-danger'}"></i>` : ''}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="question-category">
                        <div class="category-header">
                            <h4>${type}</h4>
                            <span class="badge">${questions.length}题</span>
                        </div>
                        <div class="category-questions">
                            ${questionLinks}
                        </div>
                    </div>
                `;
            }).join('');

        this.questionNavList.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            const index = parseInt(item.dataset.index);
            if (!isNaN(index)) {
                this.currentQuestionIndex = index;
                this.showQuestion();
            }
        });
    }

    toggleSettingsPanel() {
        const isHidden = this.settingsPanel.classList.contains('hidden');
        if (isHidden) {
            this.settingsPanel.classList.remove('hidden');
            this.settingsPanel.classList.add('visible');
        } else {
            this.settingsPanel.classList.remove('visible');
            this.settingsPanel.classList.add('hidden');
        }
        this.questionOrderSelect.value = this.isRandomOrder ? 'random' : 'sequential';
    }

    shuffleQuestions() {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }

    toggleMode() {
        // Clear any existing timer
        if (this.currentQuestionTimer) {
            clearInterval(this.currentQuestionTimer);
            this.currentQuestionTimer = null;
        }
        
        this.isPracticeMode = !this.isPracticeMode;
        if (!this.isPracticeMode) {
            this.prepareAssessmentQuestions();
            this.remainingTime = this.timePerQuestion;
            this.timerDisplay.classList.remove('warning');
            this.timerDisplay.textContent = '1:00';
        }
        this.updateModeDisplay();
        this.resetQuiz();
    }

    prepareAssessmentQuestions() {
        // 按题型分组所有题目
        const questionsByType = {};
        this.allQuestions.forEach(q => {
            const type = q.type || '未知题型';
            if (!questionsByType[type]) {
                questionsByType[type] = [];
            }
            questionsByType[type].push(q);
        });

        // 清空当前题目
        this.questions = [];

        // 只处理指定的题型顺序
        this.questionTypes.forEach(type => {
            const typeQuestions = questionsByType[type] || [];
            if (typeQuestions.length > 0) {
                // 为当前题型选择10题
                const shuffled = [...typeQuestions];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                // 选择并标记题目
                const selectedQuestions = shuffled.slice(0, this.questionsPerType);
                selectedQuestions.forEach(q => {
                    q.type = type;
                    q.typeIndex = selectedQuestions.indexOf(q); // 添加类型内的索引
                });
                
                // 添加到题目列表
                this.questions = this.questions.concat(selectedQuestions);
            } else {
                console.warn(`题型 "${type}" 没有足够的题目`);
            }
        });

        // 检查所有必需题型是否都有题目
        if (this.questions.length < this.questionTypes.length * this.questionsPerType) {
            console.warn(`总题目数不足 ${this.questionTypes.length * this.questionsPerType} 题`);
        }
    }

    startQuestionTimer() {
        if (this.currentQuestionTimer) {
            clearInterval(this.currentQuestionTimer);
        }
        this.remainingTime = this.timePerQuestion;

        // 更新计时器显示
        // In assessment mode, we use the countdown timer element
        let timerDisplay = !this.isPracticeMode ? this.timerDisplay : document.getElementById('timeSpent');
        let updateTimer = () => {
            if (this.remainingTime > 0) {
                this.remainingTime--;
                let minutes = Math.floor(this.remainingTime / 60);
                let seconds = this.remainingTime % 60;
                timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // Add warning class when time is running low (less than 10 seconds)
                if (this.remainingTime <= 10) {
                    timerDisplay.classList.add('warning');
                } else {
                    timerDisplay.classList.remove('warning');
                }
            } else {
                clearInterval(this.currentQuestionTimer);
                this.handleTimeUp();
            }
        };

        this.currentQuestionTimer = setInterval(updateTimer, 1000);
        updateTimer(); // Initial display update
    }

    handleTimeUp() {
        // Record current selection as answer
        const selectedOption = document.querySelector('input[name="option"]:checked');
        const answer = selectedOption ? selectedOption.value : null;
        this.answers.set(this.currentQuestionIndex, answer);
        
        // Auto advance to next question or submit test
        if (this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => this.nextQuestion(), 100); // Small delay for better UX
        } else {
            this.submitTest();
        }
    }

    updateModeDisplay() {
        this.modeToggleBtn.innerHTML = `<i class="fas fa-${this.isPracticeMode ? 'edit' : 'clock'}"></i> ${this.isPracticeMode ? '练习模式' : '模拟测评'}`;

        this.checkAnswerBtn.classList.toggle('hidden', !this.isPracticeMode);
        this.submitTestBtn.classList.toggle('hidden', this.isPracticeMode);

        this.timerDisplay.classList.toggle('hidden', this.isPracticeMode);
        // Hide navigation elements in assessment mode
        document.getElementById('prevBtn').classList.toggle('hidden', !this.isPracticeMode);
        
        // Hide type progress containers in assessment mode
        this.questionTypes.forEach(type => {
            const typeSection = document.getElementById(type + 'Section');
            if (typeSection) {
                typeSection.classList.toggle('hidden', !this.isPracticeMode);
            }
        });

        if (this.isPracticeMode) {
            this.navToggleBtn.classList.remove('hidden');
        } else {
            this.navToggleBtn.classList.add('hidden');
            this.questionNav.classList.remove('visible');
            this.questionNav.classList.add('hidden');
        }

        if (!this.isPracticeMode) {
            this.startTimer();
        } else {
            this.stopTimer();
        }

        this.updateQuestionNav();
    }

    resetQuiz() {
        this.answers.clear();
        this.currentQuestionIndex = 0;

        if (!this.isPracticeMode) {
            this.prepareAssessmentQuestions();
        } else {
            this.questions = [...this.allQuestions];
            if (this.isRandomOrder) {
                this.shuffleQuestions();
            }
        }

        this.updateStats();
        this.showQuestion();
        this.answerElement.classList.add('hidden');
        this.updateQuestionNav();
    }

    startTimer() {
        this.startTime = new Date();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now - this.startTime;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            this.timeSpentElement.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async loadQuestions(filename) {
        try {
            this.questionElement.innerHTML = `正在加载题库...`;
            this.optionsElement.innerHTML = '';

            const response = await fetch(`http://localhost:${this.serverPort}/questions?file=${filename}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load questions');
            }

            const data = await response.json();
            this.parseQuestions(data.content);

            this.watchQuestions(filename);
            console.log(`Successfully loaded ${filename}`);
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questionElement.innerHTML = `加载题库失败: ${error.message}<br>请刷新页面重试`;
        }
    }

    watchQuestions(type = 'default') {
        if (this.updateChecker) {
            clearInterval(this.updateChecker);
        }

        let lastModified = 0;
        this.updateChecker = setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:${this.serverPort}/check-updates?type=${type}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    console.warn(`File watch warning: ${errorData.error}`);
                    return;
                }

                const data = await response.json();

                if (lastModified === 0) {
                    lastModified = data.lastModified;
                    console.log(`Started watching ${type} with timestamp ${lastModified}`);
                } else if (data.lastModified > lastModified) {
                    lastModified = data.lastModified;
                    await this.loadQuestions(type);
                    console.log(`Questions updated from file changes in ${type}`);
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }, 2000);
    }

    parseQuestions(markdown) {
        const sections = markdown.split(/# .+? #/).filter(section => section.trim());
        const questions = [];

        let currentType = '';

        const typeMatches = markdown.match(/# (.+?) #/g) || [];
        const types = typeMatches.map(match => match.replace(/^# (.+?) #$/, '$1'));

        sections.forEach((section, index) => {
            currentType = types[index] || '';

            const blocks = section.split(/# \d+/).filter(block => block.trim());
            blocks.forEach(block => {
                const question = this.parseQuestionBlock(block, currentType);
                if (question) {
                    questions.push(question);
                }
            });
        });

        if (questions.length > 0) {
            this.allQuestions = questions;
            this.questions = [...questions];

            if (this.isRandomOrder) {
                this.shuffleQuestions();
            }

            this.currentQuestionIndex = 0;
            this.showQuestion();
            this.updateQuestionNav();
        } else {
            this.showFormatError();
        }
    }

    parseQuestionBlock(block, type) {
        const lines = block.split('\n').filter(line => line.trim());
        const questionText = [];
        const options = [];
        let answer = '';
        let explanation = '';
        let currentPart = 'question';
        let content = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('![')) {
                questionText.push(trimmedLine);
                continue;
            }

            if (/^[A-Z]:/.test(trimmedLine)) {
                if (currentPart === 'question') {
                    content = questionText.join('\n').trim();
                }
                options.push(trimmedLine);
                currentPart = 'options';
            } else if (trimmedLine.startsWith('答案:')) {
                answer = trimmedLine.split(':')[1].trim();
                currentPart = 'answer';
            } else if (trimmedLine.startsWith('解析:')) {
                explanation = trimmedLine.substring(3).trim();
                currentPart = 'explanation';
            } else {
                if (currentPart === 'question') {
                    questionText.push(trimmedLine);
                } else if (currentPart === 'explanation') {
                    explanation += ' ' + trimmedLine;
                }
            }
        }

        if (questionText.length && options.length && answer) {
            return {
                content: content || questionText.join('\n'),
                question: questionText.join('\n'),
                options,
                answer,
                explanation,
                type
            };
        }
        return null;
    }

    handleOptionClick(event) {
        const option = event.target.closest('.option');
        if (!option) return;

        const currentQuestion = this.questions[this.currentQuestionIndex];
        if (!currentQuestion) return;

        const options = this.optionsElement.querySelectorAll('.option');
        options.forEach(opt => opt.classList.remove('selected', 'correct', 'wrong'));

        option.classList.add('selected');
        const selectedAnswer = option.textContent.trim()[0];
        const isCorrect = selectedAnswer === currentQuestion.answer;
        this.answers.set(this.currentQuestionIndex, selectedAnswer);

        if (this.isPracticeMode) {
            option.classList.add(isCorrect ? 'correct' : 'wrong');
            this.answerElement.classList.remove('hidden');
        }

        this.updateStats();
        this.updateProgress();
        this.updateQuestionNav();
    }

    submitTest() {
        if (!this.isPracticeMode) {
            // 在测评模式下,清除当前题目的计时器
            if (this.currentQuestionTimer) {
                clearInterval(this.currentQuestionTimer);
            }
        }

        if (this.answers.size < this.questions.length) {
            const confirmed = confirm('还有题目未完成，确定要提交吗？');
            if (!confirmed) return;
        }

        this.stopTimer();
        this.showAllAnswers();
        this.submitTestBtn.disabled = true;
        this.showTestResults();
    }

    showTestResults() {
        const total = this.questions.length;
        let correct = 0;
        const correctQuestions = [];
        const wrongQuestions = [];

        this.questions.forEach((question, index) => {
            const userAnswer = this.answers.get(index);
            if (!userAnswer) return;

            if (userAnswer === question.answer) {
                correct++;
                correctQuestions.push({ index, question, userAnswer });
            } else {
                wrongQuestions.push({ index, question, userAnswer });
            }
        });

        this.totalQuestionsElement.textContent = total;
        this.totalCorrectElement.textContent = correct;
        this.totalWrongElement.textContent = this.answers.size - correct;
        this.finalAccuracyElement.textContent = `${Math.round((correct / this.answers.size) * 100)}%`;

        const timeSpent = new Date() - this.startTime;
        const hours = Math.floor(timeSpent / 3600000);
        const minutes = Math.floor((timeSpent % 3600000) / 60000);
        const seconds = Math.floor((timeSpent % 60000) / 1000);
        this.totalTimeElement.textContent =
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.wrongQuestionsListElement.innerHTML = wrongQuestions.map(item => `
            <div class="result-question-item wrong" data-index="${item.index}">
                <span class="question-number">第 ${item.index + 1} 题</span>
                <span class="question-result">
                    <span class="user-answer">选择：${item.userAnswer}</span>
                    <span class="correct-answer">正确：${item.question.answer}</span>
                </span>
            </div>
        `).join('');

        this.correctQuestionsListElement.innerHTML = correctQuestions.map(item => `
            <div class="result-question-item correct" data-index="${item.index}">
                <span class="question-number">第 ${item.index + 1} 题</span>
                <span class="question-result">
                    <span class="answer">答案：${item.question.answer}</span>
                </span>
            </div>
        `).join('');

        this.wrongQuestionsListElement.addEventListener('click', (e) => this.handleResultItemClick(e));
        this.correctQuestionsListElement.addEventListener('click', (e) => this.handleResultItemClick(e));

        this.resultsPanel.classList.remove('hidden');
        this.resultsPanel.classList.add('visible');
    }

    handleResultItemClick(event) {
        const item = event.target.closest('.result-question-item');
        if (!item) return;

        const index = parseInt(item.dataset.index);
        if (!isNaN(index)) {
            this.currentQuestionIndex = index;
            this.showQuestion();
        }
    }

    showAllAnswers() {
        const options = this.optionsElement.querySelectorAll('.option');
        const userAnswer = this.answers.get(this.currentQuestionIndex);
        const currentQuestion = this.questions[this.currentQuestionIndex];

        if (userAnswer) {
            options.forEach(option => {
                const optionLetter = option.textContent.trim()[0];
                if (optionLetter === userAnswer) {
                    option.classList.add(userAnswer === currentQuestion.answer ? 'correct' : 'wrong');
                }
            });
        }

        this.correctAnswerElement.textContent = currentQuestion.answer;
        this.explanationElement.innerHTML = marked.parse(currentQuestion.explanation);
        this.answerElement.classList.remove('hidden');

        this.updateStats();
    }

    showQuestion() {
        // Clear any existing timer
        if (this.currentQuestionTimer) {
            clearInterval(this.currentQuestionTimer);
            this.currentQuestionTimer = null;
        }
        
        // Start new timer in assessment mode
        if (!this.isPracticeMode) {
            this.remainingTime = this.timePerQuestion;
            this.startQuestionTimer();
        }
        const question = this.questions[this.currentQuestionIndex];
        if (!question) {
            this.updateUI();
            return;
        }

        this.questionElement.innerHTML = marked.parse(question.question);

        const images = this.questionElement.getElementsByTagName('img');
        for (const img of images) {
            if (!img.src.includes('images/')) {
                img.src = `images/${img.getAttribute('src')}`;
            }
        }

        // 在模拟测评模式下，显示当前题型的进度
        if (!this.isPracticeMode) {
            const currentType = question.type;
            const typeQuestions = this.questions.filter(q => q.type === currentType);
            const typeIndex = typeQuestions.indexOf(question);
            const questionNumber = typeIndex + 1;
            this.questionNumberElement.textContent = `${currentType}第${questionNumber}/10题`;
            this.questionTypeElement.textContent = `共${this.questionTypes.length}个题型`;
        } else {
            this.questionNumberElement.textContent = `题目 ${this.currentQuestionIndex + 1}/${this.questions.length}`;
            this.questionTypeElement.textContent = question.type || '未知题型';
        }
        this.updateProgress();

        const isMarked = this.markedQuestions.has(this.currentQuestionIndex);
        this.markQuestionBtn.classList.toggle('active', isMarked);
        this.markQuestionBtn.innerHTML = `<i class="fas fa-bookmark"></i> ${isMarked ? '取消标记' : '标记题目'}`;

        this.optionsElement.innerHTML = question.options
            .map(option => `<div class="option">${marked.parse(option)}</div>`)
            .join('');

        const previousAnswer = this.answers.get(this.currentQuestionIndex);
        if (previousAnswer) {
            const options = this.optionsElement.querySelectorAll('.option');
            options.forEach(option => {
                if (option.textContent.trim()[0] === previousAnswer) {
                    option.classList.add('selected');
                    if (this.isPracticeMode || this.submitTestBtn.disabled) {
                        option.classList.add(previousAnswer === question.answer ? 'correct' : 'wrong');
                    }
                }
            });
        }

        this.answerElement.classList.add('hidden');
        if (this.isPracticeMode || this.submitTestBtn.disabled) {
            this.correctAnswerElement.textContent = question.answer;
            this.explanationElement.innerHTML = marked.parse(question.explanation);
        }

        this.fixImagePaths();

        const questionType = this.detectQuestionType(question);
        this.questionTypeElement.textContent = questionType;
    }

    detectQuestionType(question) {
        return question.type || '未知题型';
    }

    updateStats() {
        const total = this.answers.size;
        let correct = 0;

        // 按题型统计正确率
        const statsByType = {};
        this.questionTypes.forEach(type => {
            statsByType[type] = {
                total: 0,
                correct: 0,
                answered: 0
            };
        });

        this.answers.forEach((answer, index) => {
            const question = this.questions[index];
            const type = question.type;
            
            if (statsByType[type]) {
                statsByType[type].answered++;
                if (answer === question.answer) {
                    correct++;
                    statsByType[type].correct++;
                }
            }
        });

        // 更新总体统计
        if (!this.isPracticeMode) {
            if (!this.submitTestBtn.disabled) {
                // 在模拟测评未提交前隐藏所有统计信息，只显示完成数量
                this.correctCountElement.textContent = '--';
                this.wrongCountElement.textContent = '--';
                this.accuracyElement.textContent = '--';
                this.completionElement.textContent = `${total}/${this.questions.length}题`;
            } else {
                // 测评提交后显示完整统计
                this.correctCountElement.textContent = correct;
                this.wrongCountElement.textContent = total - correct;
                this.accuracyElement.textContent = `${Math.round((correct / total) * 100)}%`;
                this.completionElement.textContent = `${total}/${this.questions.length}题`;
            }
        } else {
            // 练习模式显示实时统计
            if (total > 0) {
                this.correctCountElement.textContent = correct;
                this.wrongCountElement.textContent = total - correct;
                this.accuracyElement.textContent = `${Math.round((correct / total) * 100)}%`;
                this.completionElement.textContent = `${total}/${this.questions.length}题`;
            } else {
                this.correctCountElement.textContent = '0';
                this.wrongCountElement.textContent = '0';
                this.accuracyElement.textContent = '0%';
                this.completionElement.textContent = '0/0题';
            }
        }

        this.markedCountElement.textContent = this.markedQuestions.size;

        // 仅在练习模式或测评已提交时显示题型统计
        if (this.isPracticeMode || this.submitTestBtn.disabled) {
            let statsContainer = document.querySelector('.type-stats-container');
            if (!statsContainer) {
                statsContainer = document.createElement('div');
                statsContainer.className = 'type-stats-container';
                const statusBar = document.querySelector('.status-bar');
                statusBar.appendChild(statsContainer);
            }
            
            // 生成各题型的统计信息
            const statsHTML = Object.entries(statsByType)
                .map(([type, data]) => {
                    const accuracy = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
                    const accuracyDisplay = !this.isPracticeMode && !this.submitTestBtn.disabled ? '--' : `${accuracy}%`;
                    return `
                        <div class="type-stat">
                            <span class="type-name">${type}</span>
                            <span class="type-accuracy">正确率: ${accuracyDisplay}</span>
                        </div>
                    `;
                }).join('');

            statsContainer.innerHTML = statsHTML;
        } else {
            // 在练习模式下移除题型统计显示
            const statsContainer = document.querySelector('.type-stats-container');
            if (statsContainer) {
                statsContainer.remove();
            }
        }
    }

    updateProgress() {
        if (this.questions.length === 0) return;

        // 更新总体进度
        const progress = (this.answers.size / this.questions.length) * 100;
        this.progressElement.style.width = `${progress}%`;

        // 只在练习模式下显示题型进度
        if (this.isPracticeMode) {
            const questionsByType = {};
            this.questionTypes.forEach(type => {
                questionsByType[type] = {
                    total: 0,
                    answered: 0
                };
            });

            this.questions.forEach((q, index) => {
                const type = q.type;
                if (questionsByType[type]) {
                    questionsByType[type].total++;
                    if (this.answers.has(index)) {
                        questionsByType[type].answered++;
                    }
                }
            });

            // 更新或创建题型进度容器
            let progressContainer = document.querySelector('.type-progress-container');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'type-progress-container';
                const questionContainer = document.getElementById('questionContainer');
                questionContainer.insertBefore(progressContainer, this.questionElement);
            }

            // 生成进度HTML
            const progressHTML = Object.entries(questionsByType)
                .map(([type, data]) => {
                    const typeProgress = (data.answered / data.total) * 100;
                    return `
                        <div class="type-progress">
                            <span class="type-label">${type}</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${typeProgress}%"></div>
                            </div>
                            <span class="progress-text">${data.answered}/${data.total}</span>
                        </div>
                    `;
                }).join('');

            progressContainer.innerHTML = progressHTML;
        } else {
            // 在测评模式下移除题型进度显示
            const progressContainer = document.querySelector('.type-progress-container');
            if (progressContainer) {
                progressContainer.remove();
            }
        }
    }
    
    updateUI() {
        if (this.questions.length === 0) {
            this.questionElement.innerHTML = '正在加载题库...';
            this.optionsElement.innerHTML = '';
            this.questionNumberElement.textContent = '';
            this.answerElement.classList.add('hidden');
            this.questionTypeElement.textContent = '';
        }
    }

    showFormatError() {
        this.questionElement.innerHTML = `
            题目格式错误，请确保 test.md 文件格式正确：
            <pre style="background:#f5f5f5;padding:10px;border-radius:5px;margin-top:10px">
# 1

题目描述...

A: 选项A
B: 选项B
C: 选项C

答案: A

解析: 解析内容</pre>
        `;
    }

    fixImagePaths() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                if (src.startsWith('images/')) {
                    img.src = './' + src;
                } else if (src.startsWith('(images/')) {
                    img.src = './' + src.substring(1);
                }
                img.src = img.src.replace(/\{[^}]*\}/g, '');
            }
        });
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuestion();
            this.updateQuestionNav();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuestion();
            this.updateQuestionNav();
        }
    }

    toggleAnswer() {
        if (this.isPracticeMode) {
            this.answerElement.classList.toggle('hidden');
        }
    }

    toggleMarkQuestion() {
        const currentIndex = this.currentQuestionIndex;
        const markQuestionBtn = document.getElementById('markQuestion');
        
        if (this.markedQuestions.has(currentIndex)) {
            this.markedQuestions.delete(currentIndex);
            markQuestionBtn.classList.remove('active');
            markQuestionBtn.setAttribute('title', '按 M 键标记此题');
        } else {
            this.markedQuestions.add(currentIndex);
            markQuestionBtn.classList.add('active');
            markQuestionBtn.setAttribute('title', '按 M 键取消标记');
            
            // 添加标记动画
            const icon = markQuestionBtn.querySelector('i');
            icon.classList.add('mark-animation');
            setTimeout(() => {
                icon.classList.remove('mark-animation');
            }, 500);
        }

        this.updateUI();
        this.updateQuestionNav();
        
        // 更新按钮文本和图标，移除数量显示
        markQuestionBtn.innerHTML = `
            <i class="fas fa-bookmark"></i>
            ${this.markedQuestions.has(currentIndex) ? '取消标记' : '标记题目'}
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});