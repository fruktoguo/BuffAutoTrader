// ==UserScript==
// @name         Buff自动刷新及购买
// @namespace    http://tampermonkey.net/
// @version      2024-04-07
// @description  模仿手动操作,自动刷新和购买一个物品,速度较慢,不一定抢得过其他脚本,只能支持一个界面,因为设置项是全局生效的,可以挂在后台
// @include         /https:\/\/buff\.163\.com\/(market|goods)\/(csgo|dota2|rust|h1z1|tf2|pubg|pubg_recycle|\d+)/
// @author       YuoHira
// @license      MIT
// @match        https://buff.163.com/goods/*?from=market
// @icon         https://www.google.com/s2/favicons?sz=64&domain=163.com
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/491687/Buff%E8%87%AA%E5%8A%A8%E5%88%B7%E6%96%B0%E5%8F%8A%E8%B4%AD%E4%B9%B0.user.js
// @updateURL https://update.greasyfork.org/scripts/491687/Buff%E8%87%AA%E5%8A%A8%E5%88%B7%E6%96%B0%E5%8F%8A%E8%B4%AD%E4%B9%B0.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 获取当前页面的URL
    console.log('当前物品ID   ' + getItemID());

    const singleConfig = {
        等待载入延迟: GM_getValue(getItemID() + '等待载入延迟', 3000),
        购买延迟: GM_getValue(getItemID() + '购买延迟', 200),
        确认付款延迟: GM_getValue(getItemID() + '确认付款延迟', 1000),
        价格过高刷新延迟: GM_getValue(getItemID() + '价格过高刷新延迟', 500),
        最小价格: GM_getValue(getItemID() + '最小价格', -1),
    };

    const batchConfig = {
        等待载入延迟: GM_getValue(getItemID() + '批量等待载入延迟', 3000),
        购买延迟: GM_getValue(getItemID() + '批量购买延迟', 1000),
        确认付款延迟: GM_getValue(getItemID() + '批量确认付款延迟', 1000),
        价格过高刷新延迟: GM_getValue(getItemID() + '批量价格过高刷新延迟', 500),
        最大价格: GM_getValue(getItemID() + '批量最大价格', -1),
        购买数量: GM_getValue(getItemID() + '批量购买数量', 1)
    };


    let config = GM_getValue(getItemID() + 'buyMode', 'single') == 'single' ? singleConfig : batchConfig;

    let mainPanel = document.createElement('div');

    let isChecking = false;

    let isSingle = GM_getValue(getItemID() + 'buyMode', 'single') == 'single';
    initView();
    // 封装成一个方法
    function initView() {
        // 如果panel已经存在，就先移除它
        if (mainPanel && mainPanel.parentNode === document.body) {
            document.body.removeChild(mainPanel);
        }
        // 创建面板并添加到页面
        mainPanel = document.createElement('div');
        setupControlPanel(mainPanel);
        document.body.appendChild(mainPanel);
        mainPanel.style.textAlign = 'center';

        // 创建切换按钮
        const singleButton = document.createElement('button');
        singleButton.textContent = '单次购买';
        const isSingle = GM_getValue(getItemID() + 'buyMode', 'single') == 'single';
        singleButton.style.cssText = isSingle ? 'width: 50%; border: none; background-color: #808080; border-radius: 5px;' : 'width: 50%; border: none; background-color: #ADD8E6; border-radius: 15px;'; // 淡蓝色
        mainPanel.appendChild(singleButton);
        singleButton.addEventListener('click', () => {
            setBuyMode('single');
            // 高亮当前选择的按钮
            singleButton.style.backgroundColor = '#000000'; // 绿色
            batchButton.style.backgroundColor = '#ADD8E6'; // 恢复原色
        });

        const batchButton = document.createElement('button');
        batchButton.textContent = '批量购买';
        batchButton.style.cssText = isSingle ? 'width: 50%; border: none; background-color: #ADD8E6; border-radius: 5px;' : 'width: 50%; border: none; background-color: #808080; border-radius: 15px;';
        mainPanel.appendChild(batchButton);
        batchButton.addEventListener('click', () => {
            setBuyMode('batch');
            // 高亮当前选择的按钮
            batchButton.style.backgroundColor = '#000000'; // 绿色
            singleButton.style.backgroundColor = '#ADD8E6'; // 恢复原色
        });

        // 存储输入框元素的对象
        setupInputs(mainPanel, config);


        // 添加按钮及其事件监听
        let controlButton = document.createElement('button');
        controlButton.textContent = GM_getValue(getItemID() + 'autoBuyEnabled', false) ? '停止自动购买' : '开始自动购买';

        controlButton.style.cssText = 'width: 50%; border: none; background-color: #7CFC00; border-radius: 10px;'; // 淡绿色
        mainPanel.appendChild(controlButton);
        controlButton.addEventListener('click', () => toggleAutoBuy(controlButton));

    }

    function getPriceElements() {
        return document.querySelectorAll('.f_Strong');
    }

    // 定义一个函数来从URL中提取物品ID
    function getItemID() {
        const regExp = /goods\/(\d+)/;
        const match = window.location.href.match(regExp);

        if (match && match[1]) {
            return match[1]; // 返回物品ID
        } else {
            return null; // 如果没有匹配到，返回null
        }
    }

    // 定义一个函数来获取页面最小价格
    function getMinPrice() {
        const priceElements = getPriceElements();
        let minPrice = Number.MAX_VALUE;

        for (let priceIndex = 0; priceIndex < priceElements.length; priceIndex++) {
            const priceText = priceElements[priceIndex].textContent.replace('¥ ', '').trim();
            const price = parseFloat(priceText);

            if (price < minPrice) {
                minPrice = price;
            }
        }

        return minPrice;
    }

    //单次购买
    // 检查和刷新页面的函数
    // 使用 ES6 的语法
    function checkAndRefresh() {
        if (!GM_getValue(getItemID() + 'autoBuyEnabled', false)) return;
        isChecking = true;
        const thresholdPrice = singleConfig.最小价格;
        const minPrice = getMinPrice();

        if (minPrice <= thresholdPrice) {
            setTimeout(clickBuyButton, singleConfig.购买延迟);
        } else {
            console.log(`当前最低价格为 ${minPrice} ￥，高于阈值 ${thresholdPrice} ￥，刷新页面。`);
            setTimeout(reload, singleConfig.价格过高刷新延迟);
        }
    }

    function reload() {
        if (GM_getValue(getItemID() + 'autoBuyEnabled', false)) {
            location.reload();
        }
    }

    // 点击购买按钮的函数
    function clickBuyButton() {
        var buyButtons = document.getElementsByClassName('i_Btn i_Btn_mid2 btn-buy-order');  // 使用class名称获取购买按钮

        console.log("找到购买按钮数: " + buyButtons.length);  // 输出找到的购买按钮数量到控制台

        // 如果页面上有购买按钮
        if (buyButtons[0]) {
            console.log("找到购买按钮");
            buyButtons[0].click();  // 点击第一个购买按钮
            setTimeout(confirmPurchase, singleConfig.确认付款延迟);  //
            setTimeout(reload, 10000);
        }
    }

    // 确认付款的函数
    function confirmPurchase() {
        var confirmButtons = document.getElementsByClassName('i_Btn pay-btn');
        //检查所有按钮的文本，并查找包含“确认付款”的按钮
        if (confirmButtons[0]) {
            console.log("找到确认付款按钮");
            confirmButtons[0].click();
            setTimeout(reload, 2000);
        }else {
            console.log("没找到 确认付款按钮");
            setTimeout(reload, 2000);
        }
    }


    //批量购买
    function batchBuy_GetAndClickBtn() {
        if (!GM_getValue(getItemID() + 'autoBuyEnabled', false)) {
            return
        }

        console.log('开始批量购买');

        isChecking = true;

        var batchButton = document.getElementById('batch-buy-btn');

        if (batchButton) {
            console.log("找到批量购买按钮");
            batchButton.click();
            setTimeout(batchBuy_SetNum, 1000);
        }
    }

    function batchBuy_SetNum() {
        //获取最大售价输入框
        var maxPrice = document.getElementById('batch-buy-max-price');

        maxPrice.value = batchConfig.最大价格;

        var event = new Event('change');
        maxPrice.dispatchEvent(event);

        var butNum = document.getElementById('batch-buy-num');

        butNum.value = batchConfig.购买数量;

        butNum.dispatchEvent(event);

        //延迟
        setTimeout(batchBuy_Buy, batchConfig.购买延迟);
    }

    function batchBuy_Buy() {
        //如果开启了自动购买
        if (GM_getValue(getItemID() + 'autoBuyEnabled', false)) {
            console.log("开始查找购买按钮");
            var confirmButton = document.querySelector('.popup-bottom.black .i_Btn.i_Btn_main');
            if (confirmButton) {
                console.log("找到确认购买按钮");
                confirmButton.click();
                console.log('开始寻找确认付款按钮')
                setTimeout(confirmPurchase, batchConfig.确认付款延迟);
            }
            else {
                console.log("未找到确认购买按钮");
                setTimeout(reload, batchConfig.价格过高刷新延迟);
            }
        }
    }

    mainCheck();

    function mainCheck() {
        if (GM_getValue(getItemID() + 'buyMode', 'single') == 'single') {

            setTimeout(checkAndRefresh, singleConfig.等待载入延迟);
            if (GM_getValue(getItemID() + 'autoBuyEnabled', false)) {
                isChecking = true;
            }
            // 运行检查刷新函数的循环
            setInterval(() => {
                if (GM_getValue(getItemID() + 'autoBuyEnabled', false) && !isChecking) {
                    checkAndRefresh();
                }
            }, 2000);

        } else {
            setTimeout(batchBuy_GetAndClickBtn, batchConfig.等待载入延迟);
            if (GM_getValue(getItemID() + 'autoBuyEnabled', false)) {
                isChecking = true;
            }
            // 运行检查刷新函数的循环
            setInterval(() => {
                if (GM_getValue(getItemID() + 'autoBuyEnabled', false) && !isChecking) {
                    batchBuy_GetAndClickBtn();
                }
            }, 2000);
        }
    }

    // 面板设置
    function setupControlPanel(panel) {

        panel.style.position = 'fixed';
        panel.style.top = '20px';
        panel.style.left = '20px';
        panel.style.zIndex = '9999';
        panel.style.backgroundColor = '#808080'; // 灰色
        panel.style.padding = '10px';
        panel.style.borderRadius = '5px';
        panel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

    }

    // 输入框设置
    function setupInputs(panel, config) {
        const inputs = {};
        for (let key in config) {
            // 创建包裹输入框的div和label
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex'; // 使用flex布局
            wrapper.style.justifyContent = 'space-between'; // 左右对齐
            const label = document.createElement('label');
            label.textContent = `${key}：`;
            label.style.fontWeight = 'bold'; // 加粗文本

            // 创建输入框
            const input = document.createElement('input');
            input.type = 'number';
            input.value = config[key];

            // 特殊处理最小价格输入框，允许输入小数
            if (key.includes('价格')) {
                input.step = '0.01'; // 允许精确到分
            }

            // 根据输入类型添加事件监听器
            input.addEventListener('change', function () {
                var newKey = (isSingle ? key : '批量' + key);
                let newValue = key.includes('价格') ? parseFloat(this.value) : parseInt(this.value, 10);
                GM_setValue(getItemID() + newKey, newValue);
                config[Key] = newValue;
            });
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            panel.appendChild(wrapper);
            inputs[key] = input;
        }
        return inputs;
    }

    // 设置购买模式的函数
    function setBuyMode(mode) {

        console.log("设置购买模式: " + mode);
        GM_setValue(getItemID() + 'buyMode', mode);
        toggleBuyMode(mode);
    }

    // 切换购买模式的函数
    function toggleBuyMode(mode) {

        if (mode === 'single') {
            config = singleConfig;
            isSingle = true;
        } else {
            config = batchConfig;
            isSingle = false;
        }

        initView();
    }


    // 开启和关闭自动购买的切换功能
    function toggleAutoBuy(button) {
        let currentStatus = GM_getValue(getItemID() + 'autoBuyEnabled', false);
        GM_setValue(getItemID() + 'autoBuyEnabled', !currentStatus);
        button.textContent = currentStatus ? '开始自动购买' : '停止自动购买';
    }

})();
