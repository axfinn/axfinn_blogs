/**
 * 中国节假日特效系统
 * Chinese Holiday Effects System
 * 
 * 自动检测节假日并显示炫酷特效，节日过后自动恢复正常
 */

const HolidayEffects = {
    // 节假日配置
    holidays: [
        {
            id: 'christmas',
            name: '圣诞节',
            emoji: '🎄',
            greeting: '圣诞快乐',
            // 开始: 12月23日, 结束: 12月26日
            getDateRange: (year) => ({
                start: new Date(year, 11, 23, 0, 0, 0), // 12月23日
                end: new Date(year, 11, 26, 23, 59, 59) // 12月26日
            }),
            effects: ['snow', 'christmasTree', 'banner', 'music'],
            // 圣诞节背景音乐 - 本地文件
            music: '/audio/christmas-bgm.mp3',
            theme: {
                primary: '#2E7D32',    // 圣诞绿
                secondary: '#C62828',  // 圣诞红
                accent: '#FFD700'      // 金色
            }
        },
        {
            id: 'new_year',
            name: '元旦',
            emoji: '🎉',
            greeting: '新年快乐',
            // 开始: 12月30日, 结束: 1月2日
            getDateRange: (year) => ({
                start: new Date(year - 1, 11, 30, 0, 0, 0), // 12月30日
                end: new Date(year, 0, 2, 23, 59, 59) // 1月2日
            }),
            effects: ['fireworks', 'confetti', 'countdown', 'banner', 'music'],
            // 元旦庆祝音乐 - SoundHelix 欢快电子风格 (完整曲目)
            music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            theme: {
                primary: '#e53935',    // 红色
                secondary: '#FFD700',  // 金色
                accent: '#FF6B6B'
            }
        },
        {
            id: 'spring_festival',
            name: '春节',
            emoji: '🧧',
            greeting: '恭喜发财',
            zodiac: '马', // 2026年生肖
            // 2026年春节: 2月17日 (马年)
            // 特效期: 除夕(2/16) - 初五(2/21)
            getDateRange: (year) => {
                // 2026年春节日期
                if (year === 2026) {
                    return {
                        start: new Date(2026, 1, 16, 0, 0, 0),  // 2月16日 除夕
                        end: new Date(2026, 1, 21, 23, 59, 59)  // 2月21日 初五
                    };
                }
                // 默认返回一个永不匹配的范围（未来年份需要手动更新）
                return { start: new Date(0), end: new Date(0) };
            },
            effects: ['fireworks', 'redPackets', 'lanterns', 'banner', 'music'],
            // 春节喜庆音乐
            music: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            theme: {
                primary: '#C62828',    // 中国红
                secondary: '#FFD700',  // 金色
                accent: '#FF8F00'      // 橙金色
            }
        }
        // 更多节日可以在这里添加...
    ],

    // 当前激活的节日
    activeHoliday: null,

    // 特效元素引用
    elements: {},

    // 动画帧引用
    animationFrames: {},

    // 用户设置
    userSettings: {
        enabled: true,
        musicEnabled: true
    },

    // 音频元素
    audioElement: null,

    /**
     * 初始化节假日特效
     */
    init: function () {
        // 加载用户设置
        this.loadSettings();

        // 检测当前节日
        this.activeHoliday = this.detectHoliday();

        if (this.activeHoliday && this.userSettings.enabled) {
            console.log(`🎊 节日特效已激活: ${this.activeHoliday.name}`);
            this.applyHolidayEffects();
        }

        // 创建控制按钮
        this.createControlButton();
    },

    /**
     * 检测当前是否在某个节假日期间
     */
    detectHoliday: function () {
        const now = new Date();
        const currentYear = now.getFullYear();

        for (const holiday of this.holidays) {
            // 检查当前年份和下一年份（处理跨年）
            for (let year = currentYear; year <= currentYear + 1; year++) {
                const range = holiday.getDateRange(year);
                if (now >= range.start && now <= range.end) {
                    return { ...holiday, year: year, range: range };
                }
            }
        }
        return null;
    },

    /**
     * 应用节日特效
     */
    applyHolidayEffects: function () {
        if (!this.activeHoliday) return;

        // 添加节日主题类
        document.body.classList.add('holiday-active', `holiday-${this.activeHoliday.id}`);

        // 应用主题色
        this.applyThemeColors();

        // 启用各种特效
        for (const effect of this.activeHoliday.effects) {
            switch (effect) {
                case 'fireworks':
                    this.startFireworks();
                    break;
                case 'confetti':
                    this.startConfetti();
                    break;
                case 'countdown':
                    this.showCountdown();
                    break;
                case 'banner':
                    this.showBanner();
                    break;
                case 'snow':
                    this.startSnow();
                    break;
                case 'christmasTree':
                    this.showChristmasTree();
                    break;
                case 'music':
                    this.startMusic();
                    break;
                case 'redPackets':
                    this.startRedPackets();
                    break;
                case 'lanterns':
                    this.showLanterns();
                    break;
            }
        }
    },

    /**
     * 应用节日主题色
     */
    applyThemeColors: function () {
        const theme = this.activeHoliday.theme;
        const root = document.documentElement;

        root.style.setProperty('--holiday-primary', theme.primary);
        root.style.setProperty('--holiday-secondary', theme.secondary);
        root.style.setProperty('--holiday-accent', theme.accent);
    },

    /**
     * 烟花特效
     */
    startFireworks: function () {
        // 创建 Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'holiday-fireworks';
        canvas.className = 'holiday-fireworks-canvas';
        document.body.appendChild(canvas);
        this.elements.fireworksCanvas = canvas;

        const ctx = canvas.getContext('2d');

        // 设置 Canvas 大小
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 烟花粒子类
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.velocity = {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                };
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.01;
                this.size = Math.random() * 3 + 1;
            }

            update() {
                this.velocity.y += 0.05; // 重力
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.alpha -= this.decay;
            }

            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        // 烟花类
        class Firework {
            constructor(x, targetY) {
                this.x = x;
                this.y = canvas.height;
                this.targetY = targetY;
                this.velocity = { y: -12 - Math.random() * 4 };
                this.color = `hsl(${Math.random() * 60 + 340}, 100%, 60%)`; // 红/金色调
                this.particles = [];
                this.exploded = false;
            }

            update() {
                if (!this.exploded) {
                    this.y += this.velocity.y;
                    this.velocity.y += 0.2;

                    if (this.velocity.y >= 0 || this.y <= this.targetY) {
                        this.explode();
                    }
                }

                this.particles = this.particles.filter(p => p.alpha > 0);
                this.particles.forEach(p => p.update());
            }

            explode() {
                this.exploded = true;
                const colors = ['#e53935', '#FFD700', '#FF6B6B', '#FFA500', '#FF4500'];
                for (let i = 0; i < 50; i++) {
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    this.particles.push(new Particle(this.x, this.y, color));
                }
            }

            draw(ctx) {
                if (!this.exploded) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }
                this.particles.forEach(p => p.draw(ctx));
            }

            isDone() {
                return this.exploded && this.particles.length === 0;
            }
        }

        let fireworks = [];
        let lastFirework = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const now = Date.now();
            if (now - lastFirework > 800 + Math.random() * 1500) {
                const x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
                const targetY = Math.random() * canvas.height * 0.4 + 50;
                fireworks.push(new Firework(x, targetY));
                lastFirework = now;
            }

            fireworks = fireworks.filter(f => !f.isDone());
            fireworks.forEach(f => {
                f.update();
                f.draw(ctx);
            });

            this.animationFrames.fireworks = requestAnimationFrame(animate);
        };

        animate();
    },

    /**
     * 彩带特效
     */
    startConfetti: function () {
        const container = document.createElement('div');
        container.id = 'holiday-confetti';
        container.className = 'holiday-confetti-container';
        document.body.appendChild(container);
        this.elements.confettiContainer = container;

        const colors = ['#e53935', '#FFD700', '#FF6B6B', '#FFA500', '#FFEB3B'];
        const shapes = ['circle', 'square', 'strip'];

        const createConfetti = () => {
            const confetti = document.createElement('div');
            confetti.className = 'holiday-confetti-piece';

            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const size = Math.random() * 10 + 5;
            const left = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = Math.random() * 3 + 4;

            confetti.style.cssText = `
        left: ${left}%;
        width: ${shape === 'strip' ? size * 0.3 : size}px;
        height: ${shape === 'strip' ? size * 2 : size}px;
        background: ${color};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        border-radius: ${shape === 'circle' ? '50%' : shape === 'strip' ? '2px' : '0'};
      `;

            container.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, (delay + duration) * 1000);
        };

        // 创建初始彩带
        for (let i = 0; i < 30; i++) {
            setTimeout(createConfetti, i * 100);
        }

        // 持续创建彩带
        this.animationFrames.confetti = setInterval(() => {
            if (document.visibilityState === 'visible') {
                createConfetti();
            }
        }, 300);
    },

    /**
     * 雪花特效
     */
    startSnow: function () {
        const container = document.createElement('div');
        container.id = 'holiday-snow';
        container.className = 'holiday-snow-container';
        document.body.appendChild(container);
        this.elements.snowContainer = container;

        const createSnowflake = () => {
            const snowflake = document.createElement('div');
            snowflake.className = 'holiday-snowflake';
            snowflake.innerHTML = '❄';

            const size = Math.random() * 15 + 10;
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 5 + 8;
            const opacity = Math.random() * 0.6 + 0.4;

            snowflake.style.cssText = `
                left: ${left}%;
                font-size: ${size}px;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
                opacity: ${opacity};
            `;

            container.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, (delay + duration) * 1000);
        };

        // 创建初始雪花
        for (let i = 0; i < 50; i++) {
            setTimeout(createSnowflake, i * 150);
        }

        // 持续创建雪花
        this.animationFrames.snow = setInterval(() => {
            if (document.visibilityState === 'visible') {
                createSnowflake();
            }
        }, 200);
    },

    /**
     * 圣诞树装饰
     */
    showChristmasTree: function () {
        const tree = document.createElement('div');
        tree.id = 'holiday-christmas-tree';
        tree.className = 'holiday-christmas-tree';
        tree.innerHTML = `
            <div class="christmas-tree-container">
                <div class="christmas-star">⭐</div>
                <div class="christmas-tree-body">
                    <div class="tree-layer tree-layer-1">🎄</div>
                </div>
                <div class="christmas-gifts">🎁 🎁 🎁</div>
                <div class="christmas-greeting">Merry Christmas!</div>
            </div>
        `;

        document.body.appendChild(tree);
        this.elements.christmasTree = tree;
    },

    /**
     * 红包雨特效 (春节)
     */
    startRedPackets: function () {
        const container = document.createElement('div');
        container.id = 'holiday-red-packets';
        container.className = 'holiday-red-packets-container';
        document.body.appendChild(container);
        this.elements.redPacketsContainer = container;

        const emojis = ['🧧', '💰', '🪙', '💴', '🎊'];

        const createRedPacket = () => {
            const packet = document.createElement('div');
            packet.className = 'holiday-red-packet';
            packet.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];

            const size = Math.random() * 20 + 25;
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = Math.random() * 3 + 4;
            const rotate = Math.random() * 360;

            packet.style.cssText = `
                left: ${left}%;
                font-size: ${size}px;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
                --rotate: ${rotate}deg;
            `;

            container.appendChild(packet);

            setTimeout(() => {
                packet.remove();
            }, (delay + duration) * 1000);
        };

        // 创建初始红包雨
        for (let i = 0; i < 20; i++) {
            setTimeout(createRedPacket, i * 200);
        }

        // 持续创建红包
        this.animationFrames.redPackets = setInterval(() => {
            if (document.visibilityState === 'visible') {
                createRedPacket();
            }
        }, 400);
    },

    /**
     * 灯笼装饰 (春节)
     */
    showLanterns: function () {
        const lanternsContainer = document.createElement('div');
        lanternsContainer.id = 'holiday-lanterns';
        lanternsContainer.className = 'holiday-lanterns';

        // 左右两边各一个大灯笼
        lanternsContainer.innerHTML = `
            <div class="holiday-lantern holiday-lantern-left">
                🏮
                <div class="lantern-text">福</div>
            </div>
            <div class="holiday-lantern holiday-lantern-right">
                🏮
                <div class="lantern-text">春</div>
            </div>
        `;

        document.body.appendChild(lanternsContainer);
        this.elements.lanterns = lanternsContainer;
    },

    /**
     * 背景音乐
     */
    startMusic: function () {
        if (!this.activeHoliday.music || !this.userSettings.musicEnabled) return;

        // 创建音频元素
        const audio = document.createElement('audio');
        audio.id = 'holiday-music';
        audio.src = this.activeHoliday.music;
        audio.loop = true;
        audio.volume = 0.3;
        audio.preload = 'auto';

        document.body.appendChild(audio);
        this.audioElement = audio;

        // 创建音乐控制按钮
        const musicBtn = document.createElement('button');
        musicBtn.id = 'holiday-music-btn';
        musicBtn.className = 'holiday-music-btn';

        let isPlaying = false;

        const updateButtonState = (playing) => {
            isPlaying = playing;
            if (playing) {
                musicBtn.innerHTML = '🎵';
                musicBtn.title = '点击暂停音乐';
                musicBtn.classList.add('playing');
            } else {
                musicBtn.innerHTML = '🔇';
                musicBtn.title = '点击播放节日音乐';
                musicBtn.classList.remove('playing');
            }
        };

        musicBtn.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                updateButtonState(false);
            } else {
                audio.play().then(() => {
                    updateButtonState(true);
                }).catch(e => {
                    console.log('需要用户交互才能播放音乐');
                });
            }
        });

        document.body.appendChild(musicBtn);
        this.elements.musicButton = musicBtn;

        // 尝试自动播放
        audio.play().then(() => {
            updateButtonState(true);
            console.log('🎵 节日音乐自动播放中');
        }).catch(e => {
            updateButtonState(false);
            console.log('🎵 节日音乐已准备就绪，点击按钮播放（浏览器阻止了自动播放）');
        });
    },

    /**
     * 倒计时/祝福组件
     */
    showCountdown: function () {
        const container = document.createElement('div');
        container.id = 'holiday-countdown';
        container.className = 'holiday-countdown';
        document.body.appendChild(container);
        this.elements.countdownContainer = container;

        const updateCountdown = () => {
            const now = new Date();
            const newYear = new Date(this.activeHoliday.year, 0, 1, 0, 0, 0);
            const diff = newYear - now;

            if (diff <= 0) {
                // 新年已到
                container.innerHTML = `
          <div class="holiday-countdown-content holiday-countdown-celebration">
            <span class="holiday-countdown-emoji">${this.activeHoliday.emoji}</span>
            <span class="holiday-countdown-text">${this.activeHoliday.greeting}！${this.activeHoliday.year}</span>
            <span class="holiday-countdown-emoji">${this.activeHoliday.emoji}</span>
          </div>
        `;
            } else {
                // 倒计时中
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                container.innerHTML = `
          <div class="holiday-countdown-content">
            <span class="holiday-countdown-label">距离 ${this.activeHoliday.year} ${this.activeHoliday.name}还有</span>
            <div class="holiday-countdown-timer">
              <div class="holiday-countdown-unit">
                <span class="holiday-countdown-number">${days}</span>
                <span class="holiday-countdown-unit-label">天</span>
              </div>
              <div class="holiday-countdown-unit">
                <span class="holiday-countdown-number">${String(hours).padStart(2, '0')}</span>
                <span class="holiday-countdown-unit-label">时</span>
              </div>
              <div class="holiday-countdown-unit">
                <span class="holiday-countdown-number">${String(minutes).padStart(2, '0')}</span>
                <span class="holiday-countdown-unit-label">分</span>
              </div>
              <div class="holiday-countdown-unit">
                <span class="holiday-countdown-number">${String(seconds).padStart(2, '0')}</span>
                <span class="holiday-countdown-unit-label">秒</span>
              </div>
            </div>
          </div>
        `;
            }
        };

        updateCountdown();
        this.animationFrames.countdown = setInterval(updateCountdown, 1000);
    },

    /**
     * 祝福横幅
     */
    showBanner: function () {
        const banner = document.createElement('div');
        banner.id = 'holiday-banner';
        banner.className = 'holiday-banner';

        // 春节特殊横幅
        if (this.activeHoliday.id === 'spring_festival') {
            const zodiac = this.activeHoliday.zodiac || '';
            banner.innerHTML = `
            <div class="holiday-banner-content">
              <span class="holiday-banner-text">
                🧧 ${this.activeHoliday.emoji} 恭贺新禧！祝您${this.activeHoliday.year}${zodiac}年大吉大利、${this.activeHoliday.greeting}！${this.activeHoliday.emoji} 🧧
              </span>
            </div>
          `;
        } else {
            const now = new Date();
            const newYear = new Date(this.activeHoliday.year, 0, 1, 0, 0, 0);

            if (now >= newYear) {
                banner.innerHTML = `
            <div class="holiday-banner-content">
              <span class="holiday-banner-text">
                ✨ ${this.activeHoliday.emoji} ${this.activeHoliday.greeting}！祝您 ${this.activeHoliday.year} 年万事如意！${this.activeHoliday.emoji} ✨
              </span>
            </div>
          `;
            } else {
                banner.innerHTML = `
            <div class="holiday-banner-content">
              <span class="holiday-banner-text">
                🎊 ${this.activeHoliday.year} ${this.activeHoliday.name}即将到来！🎊
              </span>
            </div>
          `;
            }
        }

        document.body.insertBefore(banner, document.body.firstChild);
        this.elements.banner = banner;
    },

    /**
     * 创建控制按钮
     */
    createControlButton: function () {
        if (!this.activeHoliday) return;

        const button = document.createElement('button');
        button.id = 'holiday-control-btn';
        button.className = 'holiday-control-btn';
        button.innerHTML = this.userSettings.enabled ? '🎆' : '🔇';
        button.title = this.userSettings.enabled ? '关闭节日特效' : '开启节日特效';

        button.addEventListener('click', () => {
            this.toggleEffects();
        });

        document.body.appendChild(button);
        this.elements.controlButton = button;
    },

    /**
     * 切换特效开关
     */
    toggleEffects: function () {
        this.userSettings.enabled = !this.userSettings.enabled;
        this.saveSettings();

        if (this.userSettings.enabled) {
            this.applyHolidayEffects();
            this.elements.controlButton.innerHTML = '🎆';
            this.elements.controlButton.title = '关闭节日特效';
        } else {
            this.removeAllEffects();
            this.elements.controlButton.innerHTML = '🔇';
            this.elements.controlButton.title = '开启节日特效';
        }
    },

    /**
     * 移除所有特效
     */
    removeAllEffects: function () {
        // 移除类
        document.body.classList.remove('holiday-active');
        if (this.activeHoliday) {
            document.body.classList.remove(`holiday-${this.activeHoliday.id}`);
        }

        // 停止动画
        if (this.animationFrames.fireworks) {
            cancelAnimationFrame(this.animationFrames.fireworks);
        }
        if (this.animationFrames.confetti) {
            clearInterval(this.animationFrames.confetti);
        }
        if (this.animationFrames.countdown) {
            clearInterval(this.animationFrames.countdown);
        }

        // 移除元素
        for (const key of Object.keys(this.elements)) {
            if (key !== 'controlButton' && this.elements[key]) {
                this.elements[key].remove();
                this.elements[key] = null;
            }
        }
    },

    /**
     * 保存用户设置
     */
    saveSettings: function () {
        try {
            localStorage.setItem('holidayEffectsSettings', JSON.stringify(this.userSettings));
        } catch (e) {
            console.warn('无法保存设置到 localStorage');
        }
    },

    /**
     * 加载用户设置
     */
    loadSettings: function () {
        try {
            const saved = localStorage.getItem('holidayEffectsSettings');
            if (saved) {
                this.userSettings = { ...this.userSettings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('无法从 localStorage 加载设置');
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    HolidayEffects.init();
});
