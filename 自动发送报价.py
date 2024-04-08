import subprocess
import time
import xml.etree.ElementTree as ET

def adb_refresh():
    # 定义adb命令
    adb_command = 'adb shell input swipe 500 400 500 1200 300'

    # 执行adb命令
    process = subprocess.Popen(adb_command, shell=True, stdout=subprocess.PIPE)

    # 等待命令执行完成
    process.wait()

def adb_back():
    # 定义adb命令
    adb_command = 'adb shell input keyevent KEYCODE_BACK'

    # 执行adb命令
    process = subprocess.Popen(adb_command, shell=True, stdout=subprocess.PIPE)

    # 等待命令执行完成
    process.wait()

# adb_refresh()

def adb_get_text(text):
    # 定义adb命令
    adb_command = f'adb shell uiautomator dump && adb shell cat /sdcard/window_dump.xml'

    # 执行adb命令
    process = subprocess.Popen(adb_command, shell=True, stdout=subprocess.PIPE)

    # 读取命令输出
    output, _ = process.communicate()

   # 计算指定文本的出现次数
    count = output.decode('utf-8').count(text)


    print(f'屏幕上有 {count} 个 {text}')


def adb_tap(x, y):
    # 定义adb命令
    adb_command = f'adb shell input tap {x} {y}'

    # 执行adb命令
    process = subprocess.Popen(adb_command, shell=True, stdout=subprocess.PIPE)

    # 等待命令执行完成
    process.wait()


def adb_get_text_position(text):
    # 获取屏幕UI结构
    subprocess.run('adb shell uiautomator dump', shell=True)
    subprocess.run('adb pull /sdcard/window_dump.xml', shell=True)

    # 解析UI结构文件
    tree = ET.parse('window_dump.xml')
    root = tree.getroot()

    # 找到包含指定文本的元素
    for node in root.iter('node'):
        if text in node.attrib.get('text', ''):
            bounds = node.attrib.get('bounds', '')
            # 解析bounds，获取元素的中心点
            x = (int(bounds.split(']')[0].split('[')[1].split(',')[0]) + int(bounds.split(']')[0].split('[')[1].split(',')[0])) / 2
            y = (int(bounds.split(']')[0].split('[')[1].split(',')[1]) + int(bounds.split(']')[0].split('[')[1].split(',')[1])) / 2
            return x, y

    return None

def adb_get_text_and_tap(text):
    position = adb_get_text_position(text)
    if position:
        adb_tap(*position)
    else:
        print(f'未找到 {text}')

while True:
    adb_back()
    time.sleep(3)
    adb_get_text_and_tap('我的购买')
    time.sleep(3)
    if adb_get_text_position('一键发送'):
        adb_tap(900, 1400)
    time.sleep(3)
    if adb_get_text_position('等待你发'):
        adb_get_text_and_tap('等待你发')
        time.sleep(3)
        # 如果有，就点击屏幕上的"发送报价"按钮
        adb_tap(600, 1100)
        time.sleep(3)
        adb_back()
    time.sleep(30)
