# PEQ tools

分享一些自用小工具，这是一个基于Web的参量均衡器(PEQ)参数计算和可视化工具。

## 功能特点

- 滤波器配置
 - 类型：
  - Peak
  - High Shelf/Low Shelf
  - High Pass/Low Pass
 - 带通：
  - Butterworth
  - Bessel
  - Chebyshev
  - Linkwitz-Riley
- 频率响应可视化

## 快速开始

### 环境要求

- Python 3.7+ （推荐3.10+，本人使用的是3.11.11）
- venv 或 conda

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/peq_tools.git
cd peq_tools
```

2. 选择安装方式

方式一：使用venv
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

方式二：使用conda
```bash
conda env create -f environment.yml
conda activate peq-tools
```

3. 运行应用
```bash
python app.py
```

应用将自动在默认浏览器中打开：http://127.0.0.1:5000/

## 使用指南

1. 选择滤波器类型
2. 调节参数：
   - 中心频率
   - Q值
   - 增益
   - 滤波器阶数（通道滤波器）
3. 查看频率响应曲线

## 配置说明

可在 config.py 中修改以下配置参数：

- 服务器端口
- 是否自动打开浏览器
- 频率响应范围和分辨率
- 增益范围和分辨率

## 许可证

本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可证。

这意味着您可以：
- 分享 — 在任何媒介以任何形式复制、发行本作品
- 演绎 — 修改、转换或以本作品为基础进行创作

惟须遵守下列条件：
- 署名 — 您必须给出适当的署名，提供指向本许可证的链接，同时标明是否（对原始作品）作了修改
- 非商业性使用 — 您不得将本作品用于商业目的

详细许可证条款请参见：https://creativecommons.org/licenses/by-nc/4.0/deed.zh

## 致谢

代码由Cursor辅助生成。