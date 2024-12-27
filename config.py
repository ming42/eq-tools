class Config:
    # Flask配置
    PORT = 5000
    DEBUG = True
    AUTO_OPEN_BROWSER = True

    # 频率响应曲线配置
    FREQ_RANGE = {
        'MIN': 20,      # Hz
        'MAX': 22000    # Hz
    }

    MAGNITUDE_RANGE = {
        'MIN': -10,     # dB
        'MAX': 30       # dB
    }

    # 频率轴刻度配置
    FREQ_SCALE = {
        'X_OCTAVE': 1/12,    # 倍频程分数表示：1=整个倍频程，1/3=三分之一倍频程，1/6=六分之一倍频程，1/12=十二分之一倍频程
        'Y_STEP': 5,         # Y轴刻度步进值（dB）
        'POINTS_PER_DECADE': 100  # 每10倍频程的计算点数
    }

    # 默认滤波器参数
    DEFAULT_FILTER = {
        'type': 'peak',
        'center_freq': 1000,
        'q': 1.4,
        'gain': 6
    }

    # 是否默认添加滤波器
    ADD_DEFAULT_FILTER = True 