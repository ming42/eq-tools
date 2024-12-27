from flask import Flask, render_template, jsonify, request
import webbrowser
from threading import Timer
import numpy as np
from scipy import signal
from scipy.signal import butter, bessel, cheby1
from config import Config

app = Flask(__name__)

def open_browser():
    if Config.AUTO_OPEN_BROWSER:
        webbrowser.open_new(f'http://127.0.0.1:{Config.PORT}/')

@app.route('/')
def index():
    # 传递配置到前端
    return render_template('index.html', config=Config)

@app.route('/get_config')
def get_config():
    # 提供配置API端点
    return jsonify({
        'freq_range': Config.FREQ_RANGE,
        'magnitude_range': Config.MAGNITUDE_RANGE,
        'freq_scale': Config.FREQ_SCALE,
        'default_filter': Config.DEFAULT_FILTER
    })

@app.route('/calculate_peak', methods=['POST'])
def calculate_peak():
    data = request.get_json()
    filter_id = data.get('filter_id', '')
    fc = float(data['center_freq'])
    q = float(data['q'])
    gain = float(data['gain'])
    
    # 使用配置的频率范围
    freq = np.logspace(
        np.log10(Config.FREQ_RANGE['MIN']), 
        np.log10(Config.FREQ_RANGE['MAX']), 
        Config.FREQ_SCALE['POINTS_PER_DECADE'] * int(np.log10(Config.FREQ_RANGE['MAX']/Config.FREQ_RANGE['MIN']))
    )
    
    # 计算频率范围
    f1 = fc / np.sqrt(1 + 1/(2*q))
    f2 = fc * np.sqrt(1 + 1/(2*q))
    
    # 生成频率响应
    w0 = 2 * np.pi * fc
    s = 1j * 2 * np.pi * freq
    
    H = 1 + (gain/2) * (s/(w0*q)) / (1 + s/(w0*q) + (s/(w0))**2)
    mag = 20 * np.log10(np.abs(H))
    
    return jsonify({
        'filter_id': filter_id,
        'f1': f1,
        'f2': f2,
        'freq': freq.tolist(),
        'magnitude': mag.tolist()
    })

@app.route('/calculate_shelf', methods=['POST'])
def calculate_shelf():
    data = request.get_json()
    filter_id = data.get('filter_id', '')
    fc = float(data['center_freq'])
    q = float(data['q'])
    gain = float(data['gain'])
    filter_type = data['filter_type']
    
    # 计算频率范围
    f1 = fc / np.sqrt(1 + 1/(2*q))
    f2 = fc * np.sqrt(1 + 1/(2*q))
    
    # 生成频率响应
    freq = np.logspace(np.log10(10), np.log10(30000), 1000)
    w0 = 2 * np.pi * fc
    s = 1j * 2 * np.pi * freq
    
    if filter_type == 'low_shelf':
        H = 1 + (gain/2) * (1 / (1 + s/(w0*q) + (s/w0)**2))
    else:  # high_shelf
        H = 1 + (gain/2) * ((s/w0)**2 / (1 + s/(w0*q) + (s/w0)**2))
    
    mag = 20 * np.log10(np.abs(H))
    
    return jsonify({
        'filter_id': filter_id,
        'f1': f1,
        'f2': f2,
        'freq': freq.tolist(),
        'magnitude': mag.tolist()
    })

@app.route('/calculate_pass_filter', methods=['POST'])
def calculate_pass_filter():
    data = request.get_json()
    filter_id = data.get('filter_id', '')
    fc = float(data['center_freq'])
    filter_type = data['filter_type']
    filter_design = data['filter_design']
    order = int(data['order'])
    
    # 生成频率响应
    freq = np.logspace(np.log10(10), np.log10(30000), 1000)
    nyq = 48000 / 2  # 采样率的一半
    wn = fc / nyq
    
    if filter_design == 'linkwitz_riley':
        # Linkwitz-Riley 是两个 Butterworth 级联
        # 所以实际阶数是输入阶数的一半
        butter_order = order // 2
        b1, a1 = butter(butter_order, wn, btype=filter_type.split('_')[0])
        # 计算两个滤波器级联的频率响应
        w, h1 = signal.freqz(b1, a1, worN=freq, fs=48000)
        h = h1 * h1  # 级联相当于响应相乘
    else:
        if filter_design == 'butterworth':
            b, a = butter(order, wn, btype=filter_type.split('_')[0])
        elif filter_design == 'bessel':
            b, a = bessel(order, wn, btype=filter_type.split('_')[0])
        elif filter_design == 'chebyshev':
            b, a = cheby1(order, 1, wn, btype=filter_type.split('_')[0])
        
        w, h = signal.freqz(b, a, worN=freq, fs=48000)
    
    mag = 20 * np.log10(np.abs(h))
    
    return jsonify({
        'filter_id': filter_id,
        'freq': freq.tolist(),
        'magnitude': mag.tolist()
    })

if __name__ == '__main__':
    Timer(1, open_browser).start()
    app.run(debug=Config.DEBUG, port=Config.PORT) 