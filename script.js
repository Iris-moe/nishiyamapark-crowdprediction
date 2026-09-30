// OpenWeather Configuration
const OPENWEATHER_API_KEY = "a4dfcfd409c36fb8b60ce5531a51616e";
const SABAE_LAT = 35.9463;
const SABAE_LON = 136.1830;
const POLLING_INTERVAL = 30;

// Application State
let activeTab = 'zoo';
let countdownValue = POLLING_INTERVAL;
let timerId = null;
let currentWeatherData = null;

// Calendar Date State
const todayObj = new Date();
let calendarYear = todayObj.getFullYear();
let calendarMonth = todayObj.getMonth(); // 0-indexed
let selectedCalendarDate = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;

let zooChart = null;
let stationChart = null;

// Spot Data Definitions
const zooSpots = [
    { id: 'z1', name: "レッサーパンダ 屋外運動場", base: 1.25, icon: "fa-paw", desc: "大人気の元気に動き回る屋外展示" },
    { id: 'z2', name: "レッサーパンダ 屋内展示舎", base: 1.10, icon: "fa-house", desc: "雨天時や高温時に人気が集中" },
    { id: 'z3', name: "ボリビアリスザル舎", base: 0.85, icon: "fa-kiwi-bird", desc: "子どもたちに大人気の賑やかエリア" },
    { id: 'z4', name: "パンダらんど (遊具広場)", base: 0.95, icon: "fa-child-reaching", desc: "ファミリー層が長めに滞在する広場" }
];

const stationSpots = [
    { id: 's1', name: "物産館 (お土産・メガネグッズ)", base: 1.15, icon: "fa-bag-shopping", desc: "鯖江銘菓・眼鏡グッズ特産品エリア" },
    { id: 's2', name: "フードコート (つつじソフト)", base: 1.30, icon: "fa-ice-cream", desc: "ランチ・ソフトクリーム注文で行列発生" },
    { id: 's3', name: "情報コーナー・テラス席", base: 0.80, icon: "fa-chair", desc: "観光案内＆休憩用テラススペース" },
    { id: 's4', name: "第1・第2 駐車場", base: 1.25, icon: "fa-square-parking", desc: "12時台は満車率が高まるメイン駐車場" }
];

function switchTab(tabId) {
    activeTab = tabId;
    
    ['zoo', 'station', 'calendar'].forEach(id => {
        const viewEl = document.getElementById(`view-${id}`);
        const tabEl = document.getElementById(`tab-${id}`);
        
        if (!viewEl || !tabEl) return;

        if (id === tabId) {
            viewEl.classList.remove('hidden');
            if (id === 'zoo') {
                tabEl.className = "relative z-30 cursor-pointer py-3.5 px-5 flex items-center space-x-2 text-emerald-800 tab-active-zoo transition shrink-0 rounded-t-2xl font-bold";
            } else if (id === 'station') {
                tabEl.className = "relative z-30 cursor-pointer py-3.5 px-5 flex items-center space-x-2 text-orange-800 tab-active-station transition shrink-0 rounded-t-2xl font-bold";
            } else {
                tabEl.className = "relative z-30 cursor-pointer py-3.5 px-5 flex items-center space-x-2 text-indigo-800 tab-active-calendar transition shrink-0 rounded-t-2xl font-bold";
            }
        } else {
            viewEl.classList.add('hidden');
            tabEl.className = "relative z-30 cursor-pointer py-3.5 px-5 flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition shrink-0 rounded-t-2xl font-bold";
        }
    });

    if (tabId === 'zoo' && currentWeatherData) renderZooChart(calcZooScore(currentWeatherData));
    if (tabId === 'station' && currentWeatherData) renderStationChart(calcStationScore(currentWeatherData));
    if (tabId === 'calendar') renderCalendar();
}

function changeCalendarMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    } else if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    }
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-days-grid');
    const label = document.getElementById('calendar-month-label');
    if (!grid || !label) return;

    label.innerText = `${calendarYear}年 ${calendarMonth + 1}月`;
    grid.innerHTML = '';

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="bg-slate-50/50 border border-slate-100 rounded-2xl p-2 min-h-[85px] sm:min-h-[105px] opacity-30 pointer-events-none"></div>`;
    }

    const today = new Date();

    for (let d = 1; d <= totalDays; d++) {
        const dateObj = new Date(calendarYear, calendarMonth, d);
        const dayOfWeek = dateObj.getDay();
        const isMonday = dayOfWeek === 1;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === d;

        let eventName = null;
        if (calendarMonth === 4 && d >= 1 && d <= 5) {
            eventName = "つつじまつり";
        } else if (calendarMonth === 10 && (d === 14 || d === 15)) {
            eventName = "もみじまつり";
        }

        let zooScore = isWeekend ? 78 : 42;
        let stationScore = isWeekend ? 82 : 48;

        if (eventName) {
            zooScore = 96;
            stationScore = 98;
        } else if (isMonday) {
            zooScore = 0;
        }

        const getBadge = (score, isZoo) => {
            if (isZoo && score === 0) return '<span class="text-[10px] text-slate-400 font-bold">休園日</span>';
            if (score >= 85) return '<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">超混雑</span>';
            if (score >= 70) return '<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">混雑</span>';
            if (score >= 45) return '<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">やや混</span>';
            return '<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">快適</span>';
        };

        let dayNumClass = "text-slate-800 font-extrabold";
        if (dayOfWeek === 0) dayNumClass = "text-rose-600 font-extrabold";
        if (dayOfWeek === 6) dayNumClass = "text-blue-600 font-extrabold";

        const dateStr = `${calendarYear}-${calendarMonth + 1}-${d}`;
        const isSelected = selectedCalendarDate === dateStr;

        grid.innerHTML += `
            <div onclick="selectCalendarDate(${calendarYear}, ${calendarMonth + 1}, ${d}, ${zooScore}, ${stationScore}, '${eventName || ''}', ${isMonday})" 
                 class="calendar-cell bg-white/90 backdrop-blur-xs border ${isSelected ? 'border-2 border-indigo-600 ring-4 ring-indigo-500/15 shadow-md' : isToday ? 'border-2 border-amber-500 shadow-sm' : 'border-slate-200/80'} rounded-2xl p-2 min-h-[85px] sm:min-h-[105px] flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg">
                
                <div class="flex items-center justify-between">
                    <span class="${dayNumClass} text-xs sm:text-sm">${d}</span>
                    ${isToday ? '<span class="text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full shadow-2xs">今日</span>' : ''}
                </div>

                ${eventName ? `<div class="truncate text-[9px] font-black text-purple-700 bg-purple-50/80 px-1.5 py-0.5 rounded-md border border-purple-200">${eventName}</div>` : ''}

                <div class="space-y-1 text-[10px] sm:text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-500 font-bold">動物園</span>
                        ${getBadge(zooScore, true)}
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-500 font-bold">道の駅</span>
                        ${getBadge(stationScore, false)}
                    </div>
                </div>
            </div>
        `;
    }

    const currentSelectedDay = today.getDate();
    if (calendarYear === today.getFullYear() && calendarMonth === today.getMonth()) {
        selectCalendarDate(today.getFullYear(), today.getMonth() + 1, currentSelectedDay, 78, 82, '', false);
    }
}

function selectCalendarDate(year, month, day, zooScore, stationScore, eventName, isMonday) {
    selectedCalendarDate = `${year}-${month}-${day}`;
    renderCalendar();

    const detailEl = document.getElementById('calendar-day-detail');
    const titleEl = document.getElementById('detail-date-title');
    const eventTag = document.getElementById('detail-event-tag');

    const dateObj = new Date(year, month - 1, day);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeekStr = weekDays[dateObj.getDay()];

    titleEl.innerText = `${year}年${month}月${day}日 (${dayOfWeekStr})`;
    
    if (eventName) {
        eventTag.classList.remove('hidden');
        eventTag.innerHTML = `<i class="fa-solid fa-star mr-1"></i> ${eventName}`;
    } else {
        eventTag.classList.add('hidden');
    }

    const zooScoreEl = document.getElementById('detail-zoo-score');
    const zooAdviceEl = document.getElementById('detail-zoo-advice');
    if (isMonday) {
        zooScoreEl.innerText = "休園";
        zooScoreEl.className = "font-black text-lg text-slate-400";
        zooAdviceEl.innerText = "毎週月曜日は西山動物園の定休日です。(※道の駅西山公園は営業しています)";
    } else {
        zooScoreEl.innerText = `${zooScore}%`;
        zooScoreEl.className = `font-black text-lg ${zooScore >= 70 ? 'text-rose-600' : zooScore >= 45 ? 'text-amber-600' : 'text-emerald-600'}`;
        zooAdviceEl.innerText = zooScore >= 75 
            ? "💡 混雑が見込まれる日です。午前10時までの早い時間帯の来園か、午後15時以降の訪問がスムーズでおすすめです。" 
            : "💡 比較的大規模な混雑がなく、ゆったりレッサーパンダの観察を楽しめる快適な予想です。";
    }

    const stationScoreEl = document.getElementById('detail-station-score');
    const stationAdviceEl = document.getElementById('detail-station-advice');
    stationScoreEl.innerText = `${stationScore}%`;
    stationScoreEl.className = `font-black text-lg ${stationScore >= 70 ? 'text-orange-600' : stationScore >= 45 ? 'text-amber-600' : 'text-emerald-600'}`;
    stationAdviceEl.innerText = stationScore >= 75 
        ? "💡 ランチタイム（11:30〜13:30）はフードコートや第1駐車場が満車に近くなる傾向があります。" 
        : "💡 混雑が比較的少なく、お土産購入や名物ソフトクリームのテイクアウトもスムーズに利用できます。";

    detailEl.classList.remove('hidden');
}

async function fetchWeatherData() {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${SABAE_LAT}&lon=${SABAE_LON}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("OpenWeather fetch response: " + response.status);
        const data = await response.json();
        currentWeatherData = data;
        updateWeatherUI(data);
        updateDashboardScores(data);
    } catch (err) {
        console.warn("Using Open-Meteo fallback for Sabae weather:", err);
        try {
            const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${SABAE_LAT}&longitude=${SABAE_LON}&current_weather=true`;
            const res = await fetch(fallbackUrl);
            const fallbackData = await res.json();
            
            currentWeatherData = {
                main: { temp: fallbackData.current_weather.temperature, feels_like: fallbackData.current_weather.temperature - 0.5, humidity: 60 },
                weather: [{ description: "晴れ (Open-Meteo連動)", main: "Clear" }],
                wind: { speed: fallbackData.current_weather.windspeed }
            };
            updateWeatherUI(currentWeatherData);
            updateDashboardScores(currentWeatherData);
        } catch (fallbackErr) {
            currentWeatherData = {
                main: { temp: 22.0, feels_like: 21.5, humidity: 55 },
                weather: [{ description: "快晴", main: "Clear" }],
                wind: { speed: 2.1 }
            };
            updateWeatherUI(currentWeatherData);
            updateDashboardScores(currentWeatherData);
        }
    }
}

function updateWeatherUI(data) {
    document.getElementById('weather-temp').innerText = `${data.main.temp.toFixed(1)}°C`;
    document.getElementById('weather-desc').innerText = data.weather[0].description;
    document.getElementById('weather-feels').innerText = `${Math.round(data.main.feels_like)}°C`;
    document.getElementById('weather-humidity').innerText = `${data.main.humidity}%`;
    document.getElementById('weather-wind').innerText = `${data.wind.speed} m/s`;

    const iconContainer = document.getElementById('weather-icon');
    const weatherMain = data.weather[0].main.toLowerCase();
    if (weatherMain.includes('clear')) {
        iconContainer.innerHTML = `<i class="fa-solid fa-sun text-amber-500 drop-shadow-sm"></i>`;
    } else if (weatherMain.includes('rain')) {
        iconContainer.innerHTML = `<i class="fa-solid fa-cloud-showers-heavy text-blue-500 drop-shadow-sm"></i>`;
    } else {
        iconContainer.innerHTML = `<i class="fa-solid fa-cloud-sun text-amber-400 drop-shadow-sm"></i>`;
    }

    const badge = document.getElementById('weather-impact-badge');
    if (weatherMain.includes('rain')) {
        badge.innerText = "雨天: 屋内(道の駅・展示舎)が人気";
        badge.parentElement.className = "md:col-span-1 bg-blue-50/80 border border-blue-200 p-3 rounded-2xl text-center shadow-2xs";
    } else {
        badge.innerText = "快晴: 屋外散策・動物園に絶好のコンディション";
        badge.parentElement.className = "md:col-span-1 bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-center shadow-2xs";
    }
}

function calcZooScore(weather) {
    const hour = new Date().getHours();
    const isWeekend = ([0, 6].includes(new Date().getDay()));
    const zooHourly = [0,0,0,0,0,0,0,0,0, 25, 55, 78, 82, 95, 88, 62, 28, 0,0,0,0,0,0,0];
    let score = zooHourly[hour] || 45;
    if (isWeekend) score *= 1.28;
    if (weather.weather[0].main.toLowerCase().includes('rain')) score *= 0.45;
    return Math.min(Math.max(Math.round(score), 10), 98);
}

function calcStationScore(weather) {
    const hour = new Date().getHours();
    const isWeekend = ([0, 6].includes(new Date().getDay()));
    const stationHourly = [0,0,0,0,0,0,0,0,0, 32, 68, 96, 92, 86, 82, 72, 48, 22, 0,0,0,0,0,0];
    let score = stationHourly[hour] || 48;
    if (isWeekend) score *= 1.22;
    if (weather.weather[0].main.toLowerCase().includes('rain')) score *= 0.88;
    return Math.min(Math.max(Math.round(score), 15), 98);
}

function updateDashboardScores(weather) {
    const zooScore = calcZooScore(weather);
    document.getElementById('zoo-score').innerText = `${zooScore}%`;
    document.getElementById('zoo-bar').style.width = `${zooScore}%`;
    const zooBadge = document.getElementById('zoo-badge');
    if (zooScore < 40) {
        zooBadge.innerText = "空いています";
        zooBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else if (zooScore < 70) {
        zooBadge.innerText = "やや混雑";
        zooBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200";
    } else {
        zooBadge.innerText = "混雑中";
        zooBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200";
    }
    renderSpotCards('zoo', zooSpots, zooScore);
    renderZooChart(zooScore);

    const stationScore = calcStationScore(weather);
    document.getElementById('station-score').innerText = `${stationScore}%`;
    document.getElementById('station-bar').style.width = `${stationScore}%`;
    const stationBadge = document.getElementById('station-badge');
    if (stationScore < 40) {
        stationBadge.innerText = "空いています";
        stationBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else if (stationScore < 70) {
        stationBadge.innerText = "やや混雑";
        stationBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200";
    } else {
        stationBadge.innerText = "混雑中";
        stationBadge.className = "inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200";
    }
    renderSpotCards('station', stationSpots, stationScore);
    renderStationChart(stationScore);
}

function renderSpotCards(type, spotsList, baseScore) {
    const container = document.getElementById(`${type}-spots-container`);
    container.innerHTML = '';

    spotsList.forEach(spot => {
        const score = Math.min(Math.max(Math.round(baseScore * spot.base), 10), 99);
        let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
        let statusText = "スムーズ";

        if (score >= 70) {
            badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
            statusText = "混雑";
        } else if (score >= 45) {
            badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
            statusText = "やや混雑";
        }

        container.innerHTML += `
            <div class="glass-card glass-card-hover p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-9 h-9 rounded-xl ${type==='zoo'?'bg-emerald-100/80 text-emerald-700':'bg-orange-100/80 text-orange-700'} flex items-center justify-center font-bold text-sm shadow-2xs">
                            <i class="fa-solid ${spot.icon}"></i>
                        </div>
                        <h4 class="font-extrabold text-slate-800 text-sm tracking-tight">${spot.name}</h4>
                    </div>
                    <span class="text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeClass}">${statusText}</span>
                </div>
                <p class="text-xs text-slate-500 font-medium leading-relaxed">${spot.desc}</p>
                <div class="flex items-baseline justify-between pt-2.5 border-t border-slate-100">
                    <span class="text-xs text-slate-400 font-semibold">予測混雑率</span>
                    <span class="text-lg font-black ${score>=70?'text-rose-600':score>=45?'text-amber-600':'text-emerald-600'}">${score}%</span>
                </div>
            </div>
        `;
    });
}

function renderZooChart(currentScore) {
    const ctx = document.getElementById('zooHourlyChart').getContext('2d');
    const labels = ['9時','10時','11時','12時','13時','14時','15時','16時'];
    const data = [25, 55, 78, 82, 95, 88, 62, 28].map(v => Math.min(Math.round(v * (currentScore / 70)), 100));

    if (zooChart) zooChart.destroy();
    zooChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '西山動物園 混雑度(%)',
                data: data,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.12)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#16a34a',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderStationChart(currentScore) {
    const ctx = document.getElementById('stationHourlyChart').getContext('2d');
    const labels = ['9時','10時','11時','12時','13時','14時','15時','16時','17時'];
    const data = [32, 55, 88, 98, 92, 86, 78, 62, 40].map(v => Math.min(Math.round(v * (currentScore / 75)), 100));

    if (stationChart) stationChart.destroy();
    stationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '道の駅西山公園 混雑度(%)',
                data: data,
                borderColor: '#ea580c',
                backgroundColor: 'rgba(234, 88, 12, 0.12)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#ea580c',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function start30SecTimer() {
    fetchWeatherData();
    countdownValue = POLLING_INTERVAL;

    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        countdownValue--;
        document.getElementById('timer-count').innerText = countdownValue;
        if (countdownValue <= 0) {
            countdownValue = POLLING_INTERVAL;
            fetchWeatherData();
        }
    }, 1000);
}

window.onload = function() {
    start30SecTimer();
};
