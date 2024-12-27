let filterCount = 0;
const filters = new Map();  // 存储所有滤波器的参数
const filterColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

function addFilter() {
    const template = document.getElementById('filter-template');
    const container = document.getElementById('filters-container');
    const clone = template.content.cloneNode(true);
    
    filterCount++;
    const filterId = `filter-${filterCount}`;
    clone.querySelector('.filter-container').dataset.filterId = filterId;
    clone.querySelector('.filter-number').textContent = filterCount;
    
    container.appendChild(clone);
    filters.set(filterId, {
        type: 'peak',
        params: {
            center_freq: 1000,
            q: 1.4,
            gain: 6
        }
    });
    
    // 为新添加的滤波器添加折叠功能
    const newFilter = container.querySelector(`[data-filter-id="${filterId}"]`);
    setupFilterCollapse(newFilter);
    
    updateAllFilters();
    saveFiltersToLocalStorage();
}

function removeFilter(button) {
    const filterContainer = button.closest('.filter-container');
    const filterId = filterContainer.dataset.filterId;
    filters.delete(filterId);
    filterContainer.remove();
    updateAllFilters();
    saveFiltersToLocalStorage();
}

function clearFilters() {
    document.getElementById('filters-container').innerHTML = '';
    filters.clear();
    filterCount = 0;
    updateAllFilters();
    saveFiltersToLocalStorage();
}

function updateFilterType(select) {
    const filterContainer = select.closest('.filter-container');
    const filterGroup = filterContainer.querySelector('.filter-group');
    const filterId = filterContainer.dataset.filterId;
    const filterDesignContainer = filterGroup.querySelector('.filter-design-container');
    const gainContainer = filterGroup.querySelector('.gain-container');
    
    const filterType = select.value;
    filters.get(filterId).type = filterType;
    
    if (filterType === 'low_pass' || filterType === 'high_pass') {
        filterDesignContainer.style.display = 'inline-block';
        gainContainer.style.display = 'none';
        handleFilterDesignChange(filterGroup);
    } else {
        filterDesignContainer.style.display = 'none';
        gainContainer.style.display = 'inline-block';
    }
    
    updateAllFilters();
}

function updateFromCenter(input) {
    const filterGroup = input.closest('.filter-group');
    const fc = parseFloat(input.value);
    const q = parseFloat(filterGroup.querySelector('.q-value').value);
    
    const f1 = fc / Math.sqrt(1 + 1/(2*q));
    const f2 = fc * Math.sqrt(1 + 1/(2*q));
    
    const f1Input = filterGroup.querySelector('.f1');
    const f2Input = filterGroup.querySelector('.f2');
    
    // 设置新值并添加动画
    f1Input.value = f1.toFixed(1);
    f2Input.value = f2.toFixed(1);
    
    // 主要修改的参数使用绿色动画
    animateParameterChange(input);
    // 相关联的参数使用蓝色动画
    animateParameterChange(f1Input, true);
    animateParameterChange(f2Input, true);
    
    updateFilter(input);
}

function updateFromQ(input) {
    const filterGroup = input.closest('.filter-group');
    const fc = parseFloat(filterGroup.querySelector('.center-freq').value);
    const q = parseFloat(input.value);
    
    const f1 = fc / Math.sqrt(1 + 1/(2*q));
    const f2 = fc * Math.sqrt(1 + 1/(2*q));
    
    const f1Input = filterGroup.querySelector('.f1');
    const f2Input = filterGroup.querySelector('.f2');
    
    // 设置新值并添加动画
    f1Input.value = f1.toFixed(1);
    f2Input.value = f2.toFixed(1);
    
    animateParameterChange(input);
    animateParameterChange(f1Input, true);
    animateParameterChange(f2Input, true);
    
    updateFilter(input);
}

function updateFromF1F2(input) {
    const filterGroup = input.closest('.filter-group');
    const f1 = parseFloat(filterGroup.querySelector('.f1').value);
    const f2 = parseFloat(filterGroup.querySelector('.f2').value);
    
    const fc = Math.sqrt(f1 * f2);
    const q = fc / (f2 - f1);
    
    const fcInput = filterGroup.querySelector('.center-freq');
    const qInput = filterGroup.querySelector('.q-value');
    
    // 设置新值并添加动画
    fcInput.value = fc.toFixed(1);
    qInput.value = q.toFixed(2);
    
    animateParameterChange(input);
    animateParameterChange(fcInput, true);
    animateParameterChange(qInput, true);
    
    updateFilter(input);
}

function updateFilter(element) {
    const filterContainer = element.closest('.filter-container');
    const filterGroup = filterContainer.querySelector('.filter-group');
    const filterId = filterContainer.dataset.filterId;
    const filterType = filterGroup.querySelector('.filter-type').value;
    
    const params = {
        center_freq: filterGroup.querySelector('.center-freq').value,
        q: filterGroup.querySelector('.q-value').value
    };
    
    if (filterType === 'low_pass' || filterType === 'high_pass') {
        params.filter_design = filterGroup.querySelector('.filter-design').value;
        params.order = filterGroup.querySelector('.filter-order').value;
    } else {
        params.gain = filterGroup.querySelector('.gain').value;
    }
    
    filters.get(filterId).type = filterType;
    filters.get(filterId).params = params;
    
    updateAllFilters();
    saveFiltersToLocalStorage();
}

function updateAllFilters() {
    if (filters.size === 0) {
        // 如果没有滤波器，显示空白图表
        const layout = createLayout();
        Plotly.newPlot('response_curve', [], layout);
        return;
    }
    
    // 并行获取所有滤波器的响应
    const promises = Array.from(filters.entries()).map(([filterId, filter]) => {
        const endpoint = getEndpoint(filter.type);
        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filter_type: filter.type,
                ...filter.params
            })
        }).then(response => response.json());
    });
    
    Promise.all(promises).then(responses => {
        const traces = responses.map((data, index) => ({
            x: data.freq,
            y: data.magnitude,
            type: 'scatter',
            mode: 'lines',
            name: `滤波器 ${index + 1} / Filter ${index + 1}`,
            line: {
                color: filterColors[index % filterColors.length]
            }
        }));
        
        // 计算总响应（所有滤波器的叠加）
        if (traces.length > 1) {
            const totalMagnitude = new Array(responses[0].magnitude.length).fill(0);
            responses.forEach(data => {
                data.magnitude.forEach((mag, i) => {
                    totalMagnitude[i] += mag;
                });
            });
            
            traces.push({
                x: responses[0].freq,
                y: totalMagnitude,
                type: 'scatter',
                mode: 'lines',
                name: '总响应 / Total Response',
                line: {
                    color: '#000',
                    width: 2,
                    dash: 'dash'
                }
            });
        }
        
        const layout = createLayout();
        Plotly.newPlot('response_curve', traces, layout, {
            displayModeBar: true,
            responsive: true,
            useResizeHandler: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
        });
    });
}

function getEndpoint(filterType) {
    if (filterType === 'peak') {
        return '/calculate_peak';
    } else if (filterType === 'low_shelf' || filterType === 'high_shelf') {
        return '/calculate_shelf';
    } else {
        return '/calculate_pass_filter';
    }
}

function createLayout() {
    const config = window.appConfig || {
        freq_range: { MIN: 20, MAX: 20000 },
        magnitude_range: { MIN: -10, MAX: 30 },
        freq_scale: { X_OCTAVE: 1/12, Y_STEP: 5 }
    };
    
    // 生成X轴倍频程刻度
    const generateOctaveScale = (start, end, step) => {
        const scale = [];
        const ratio = Math.pow(2, step);
        let freq = start;
        // 确保包含最后一个刻度
        while (freq <= end * 1.0001) { // 添加一个小的余量确保包含最后一个值
            scale.push(freq);
            freq *= ratio;
        }
        return scale;
    };

    // 生成Y轴刻度
    const generateYScale = (min, max, step) => {
        const scale = [];
        for (let db = min; db <= max; db += step) {
            scale.push(db);
        }
        return scale;
    };

    const tickvals = generateOctaveScale(
        config.freq_range.MIN,
        config.freq_range.MAX,
        config.freq_scale.X_OCTAVE
    );

    const yTickvals = generateYScale(
        config.magnitude_range.MIN,
        config.magnitude_range.MAX,
        config.freq_scale.Y_STEP
    );
    
    const formatFreq = (freq) => {
        if (freq >= 1000) {
            return (freq/1000).toString() + 'k';
        }
        return freq.toString();
    };
    
    const ticktext = tickvals.map(freq => {
        const log2Freq = Math.log2(freq/config.freq_range.MIN);
        if (Math.abs(Math.round(log2Freq) - log2Freq) < 0.001) {
            return formatFreq(Math.round(freq));
        }
        return '';
    });
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    return {
        title: {
            text: '频率响应曲线 / Frequency Response',
            font: {
                color: isDarkMode ? '#ffffff' : '#333333'
            }
        },
        xaxis: {
            title: {
                text: '频率 / Frequency (Hz)',
                font: {
                    color: isDarkMode ? '#ffffff' : '#333333'
                }
            },
            type: 'log',
            range: [Math.log10(config.freq_range.MIN), Math.log10(config.freq_range.MAX)],
            tickvals: tickvals,
            ticktext: ticktext,
            showgrid: true,
            gridcolor: isDarkMode ? '#333333' : '#eeeeee',
            gridwidth: 1,
            minorgridcount: 0,
            ticklen: ticktext.map(t => t ? 8 : 4),
            tickcolor: isDarkMode ? '#666666' : '#888888',
            tickwidth: 1,
            tickfont: {
                color: isDarkMode ? '#ffffff' : '#333333'
            }
        },
        yaxis: {
            title: {
                text: '幅度 / Magnitude (dB)',
                font: {
                    color: isDarkMode ? '#ffffff' : '#333333'
                }
            },
            range: [config.magnitude_range.MIN, config.magnitude_range.MAX],
            tickvals: yTickvals,
            showgrid: true,
            gridcolor: isDarkMode ? '#333333' : '#eeeeee',
            gridwidth: 1,
            tickfont: {
                color: isDarkMode ? '#ffffff' : '#333333'
            }
        },
        plot_bgcolor: isDarkMode ? '#1a1a1a' : 'white',
        paper_bgcolor: isDarkMode ? '#1a1a1a' : 'white',
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1,
            font: {
                color: isDarkMode ? '#ffffff' : '#333333'
            }
        },
        autosize: true,
        responsive: true,
        useResizeHandler: true,
        margin: {
            l: 60,
            r: 50,
            t: 50,
            b: 60,
            pad: 4
        }
    };
}

// 页面加载完成后初始化第一个滤波器
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initializeChart(); // 初始化图表
    restoreFiltersFromLocalStorage();
    restoreCollapsedState();
    setupThemeToggle();
    
    // 如果没有恢复任何滤波器且配置要求添加默认滤波器
    if (filters.size === 0 && window.appConfig.ADD_DEFAULT_FILTER) {
        addFilterWithConfig(window.appConfig.default_filter);
    }
});

// 处理折叠功能
document.addEventListener('DOMContentLoaded', function() {
    // 从 localStorage 恢复折叠状态
    restoreCollapsedState();
    
    // 为所有折叠按钮添加事件监听
    document.querySelectorAll('.filter-header').forEach(header => {
        header.addEventListener('click', function() {
            const container = this.closest('.filter-container');
            const content = container.querySelector('.filter-content');
            const button = this.querySelector('.toggle-btn');
            const filterId = container.dataset.filterId;
            
            // 切换折叠状态
            content.classList.toggle('collapsed');
            button.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
            
            // 保存状态到 localStorage
            saveCollapsedState(filterId, content.classList.contains('collapsed'));
            
            // 果展开��，重新计算并更新图表
            if (!content.classList.contains('collapsed')) {
                updateFilter(container);
            }
        });
    });
});

// 保存折叠状态到 localStorage
function saveCollapsedState(filterId, isCollapsed) {
    const collapsedStates = JSON.parse(localStorage.getItem('filterCollapsedStates') || '{}');
    collapsedStates[filterId] = isCollapsed;
    localStorage.setItem('filterCollapsedStates', JSON.stringify(collapsedStates));
}

// 从 localStorage 恢复折叠状态
function restoreCollapsedState() {
    const collapsedStates = JSON.parse(localStorage.getItem('filterCollapsedStates') || '{}');
    
    document.querySelectorAll('.filter-container').forEach(container => {
        const filterId = container.dataset.filterId;
        const content = container.querySelector('.filter-content');
        const button = container.querySelector('.toggle-btn');
        
        if (collapsedStates[filterId]) {
            content.classList.add('collapsed');
            button.textContent = '▶';
        }
    });
}

// 修改现有的滤波器计算函数，添加 filter_id
function calculatePeakFilter(container) {
    const filterId = container.dataset.filterId;
    // ... 其他代码保持不变 ...
    
    // 发送请求时包含 filter_id
    fetch('/calculate_peak', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filter_id: filterId,
            // ... 其他参数保持不变 ...
        })
    })
    // ... 其他代码保持不变 ...
}

// 其他滤波器计算函数也需要类似修改 

// 新增函数：设置单个滤波器的折叠功能
function setupFilterCollapse(filterContainer) {
    const header = filterContainer.querySelector('.filter-header');
    const content = filterContainer.querySelector('.filter-content');
    const button = header.querySelector('.toggle-btn');
    const filterId = filterContainer.dataset.filterId;
    
    // 阻止事件冒泡，避免点击按钮时触发整个header的点击事件
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleContent();
    });
    
    header.addEventListener('click', function(e) {
        // 如果点击的是删除按钮或其子元素，不触发折叠
        if (e.target.closest('.remove-filter-btn')) {
            return;
        }
        toggleContent();
    });
    
    function toggleContent() {
        content.classList.toggle('collapsed');
        button.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
        saveCollapsedState(filterId, content.classList.contains('collapsed'));
    }
} 

// 添加深色模式监听器
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    updateAllFilters(); // 更新图表以适应新的主题
}); 

// 添加主题切换功能
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // 如果找不到主题切换按钮，直接返回
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    // 设置初始主题
    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        themeToggle.checked = isDark;
        // 更新 CSS 变量
        document.documentElement.style.setProperty('--bg-color', isDark ? '#1a1a1a' : '#ffffff');
        updateAllFilters();
    }
    
    // 设置初始状态
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    } else {
        setTheme(prefersDark);
    }
    
    // 监听换事件
    themeToggle.addEventListener('change', function() {
        setTheme(this.checked);
        localStorage.setItem('theme', this.checked ? 'dark' : 'light');
    });
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === null) {
            setTheme(e.matches);
        }
    });
} 

// 添加保存和恢复滤波器数据的函数
function saveFiltersToLocalStorage() {
    const filters = Array.from(document.querySelectorAll('.filter')).map(filter => {
        const content = {};
        // 收集所有输入字段的值
        filter.querySelectorAll('input, select').forEach(input => {
            if (input.name) {
                content[input.name] = input.value;
            }
        });
        return { content };
    });
    
    try {
        localStorage.setItem('filters', JSON.stringify(filters));
    } catch (error) {
        console.error('Error saving filters:', error);
    }
}

function restoreFiltersFromLocalStorage() {
    const savedFilters = localStorage.getItem('filters');
    if (savedFilters) {
        try {
            const filters = JSON.parse(savedFilters);
            if (Array.isArray(filters)) {
                filters.forEach(filter => {
                    // 确保 filter 和 filter.content 存在
                    if (filter && filter.content) {
                        const newFilter = createFilterElement();
                        // 使用保存的设置更新新创建的滤波器
                        const filterContent = filter.content;
                        
                        // 更新滤波器类型选择
                        const typeSelect = newFilter.querySelector('.filter-type');
                        if (typeSelect && filterContent.type) {
                            typeSelect.value = filterContent.type;
                            typeSelect.dispatchEvent(new Event('change'));
                        }

                        // 更新其他输入字段
                        Object.keys(filterContent).forEach(key => {
                            const input = newFilter.querySelector(`[name="${key}"]`);
                            if (input && filterContent[key] !== undefined) {
                                input.value = filterContent[key];
                            }
                        });

                        // 触发计算以更新图表
                        calculateAndUpdateChart(newFilter);
                    }
                });
            }
        } catch (error) {
            console.error('Error restoring filters:', error);
            // 如果数据损坏，清除 localStorage
            localStorage.removeItem('filters');
        }
    }
} 

// 简化参数变化动画函数
function animateParameterChange(element, isRelated = false) {
    // 移除之前的动画类
    element.classList.remove('parameter-changed', 'parameter-related');
    
    // 触发重排以重置动画
    void element.offsetWidth;
    
    // 添加新的动画类
    element.classList.add(isRelated ? 'parameter-related' : 'parameter-changed');
} 

// 添加配置获取和应用函数
async function loadConfig() {
    try {
        const response = await fetch('/get_config');
        const config = await response.json();
        window.appConfig = config;
        
        // 应用配置到图表
        updateChartLayout();
        
        // 如果没有保存的滤波器，使用默认配置添加一个
        if (filters.size === 0) {
            addFilterWithConfig(config.default_filter);
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function addFilterWithConfig(filterConfig) {
    const template = document.getElementById('filter-template');
    const container = document.getElementById('filters-container');
    const clone = template.content.cloneNode(true);
    
    filterCount++;
    const filterId = `filter-${filterCount}`;
    clone.querySelector('.filter-container').dataset.filterId = filterId;
    clone.querySelector('.filter-number').textContent = filterCount;
    
    // 应用默认配置
    const filterContent = clone.querySelector('.filter-content');
    filterContent.querySelector('.filter-type').value = filterConfig.type;
    filterContent.querySelector('.center-freq').value = filterConfig.center_freq;
    filterContent.querySelector('.q-value').value = filterConfig.q;
    filterContent.querySelector('.gain').value = filterConfig.gain;
    
    container.appendChild(clone);
    filters.set(filterId, {
        type: filterConfig.type,
        params: {
            center_freq: filterConfig.center_freq,
            q: filterConfig.q,
            gain: filterConfig.gain
        }
    });
    
    setupFilterCollapse(container.querySelector(`[data-filter-id="${filterId}"]`));
    updateAllFilters();
    saveFiltersToLocalStorage();
} 

// 添加窗口大小变化监听器
window.addEventListener('resize', () => {
    Plotly.Plots.resize('response_curve');
}); 

// 添加图表初始化函数
function initializeChart() {
    Plotly.newPlot('response_curve', [], createLayout(), {
        displayModeBar: true,
        responsive: true,
        useResizeHandler: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
    });
} 