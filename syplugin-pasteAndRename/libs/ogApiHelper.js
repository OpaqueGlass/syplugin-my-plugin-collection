// debug push
let g_DEBUG = 2;
const g_NAME = "fte";
const g_FULLNAME = "双击文档树";

export function isShortcutMatch(event, key) {
    const shortcutKeys = key.split('');
    return shortcutKeys.every(key => {
      if (key === '⌥') return event.altKey;
      if (key === '⇧') return event.shiftKey;
      if (key === '⌘') return event.ctrlKey;
    //   if (key === '') return event.metaKey;
      return event.key.toUpperCase() === key.toUpperCase();
    });
}

export function getNotebooks() {
    let notebooks = window.top.siyuan.notebooks;
    return notebooks;
}


export function getFocusedBlock() {
    if (document.activeElement.classList.contains('protyle-wysiwyg')) {
        /* 光标在编辑区内 */
        let block = window.getSelection()?.focusNode?.parentElement; // 当前光标
        while (block != null && block?.dataset?.nodeId == null) block = block.parentElement;
        return block;
    }
    else return null;
}

export function getFocusedBlockId() {
    const focusedBlock = getFocusedBlock();
    if (focusedBlock == null) {
        return null;
    }
    return focusedBlock.dataset.nodeId;
}


export export async function request(url, data) {
    let resData = null;
    await fetch(url, {
        body: JSON.stringify(data),
        method: 'POST'
    }).then(function (response) {
        resData = response.json();
    });
    return resData;
}

export async function parseBody(response) {
    let r = await response;
    return r.code === 0 ? r.data : null;
}

export async function sqlAPI(stmt) {
    let data = {
        "stmt": stmt
    };
    let url = `/api/query/sql`;
    return parseBody(request(url, data));
}

export async function getTreeStat(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getTreeStat`;
    return parseBody(request(url, data));
}

export async function getDocInfo(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getDocInfo`;
    return parseBody(request(url, data));
}

export async function getKramdown(blockid){
    let data = {
        "id": blockid
    };
    let url = "/api/block/getBlockKramdown";
    let response = await parseBody(request(url, data));
    if (response) {
        return response.kramdown;
    }
}

export async function getCurrentDocIdF() {
    let thisDocId;
    thisDocId = window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
    debugPush("thisDocId by first id", thisDocId);
    if (!thisDocId && g_isMobile) {
        // UNSTABLE: 面包屑样式变动将导致此方案错误！
        try {
            let temp;
            temp = window.top.document.querySelector(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]")?.getAttribute("data-id");
            let iconArray = window.top.document.querySelectorAll(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]");
            for (let i = 0; i < iconArray.length; i++) {
                let iconOne = iconArray[i];
                if (iconOne.children.length > 0 
                    && iconOne.children[0].getAttribute("xlink:href") == "#iconFile"){
                    temp = iconOne.getAttribute("data-id");
                    break;
                }
            }
            thisDocId = temp;
        }catch(e){
            console.error(e);
            temp = null;
        }
    }
    if (!thisDocId) {
        thisDocId = window.top.document.querySelector(".protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
        debugPush("thisDocId by background must match,  id", thisDocId);
    }
    return thisDocId;
}

export function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * 在点击<span data-type="block-ref">时打开思源块/文档
 * 为引入本项目，和原代码相比有更改
 * @refer https://github.com/leolee9086/cc-template/blob/6909dac169e720d3354d77685d6cc705b1ae95be/baselib/src/commonFunctionsForSiyuan.js#L118-L141
 * @license 木兰宽松许可证
 * @param {点击事件} event 
 */
export function openRefLink(event, paramId = ""){
    
    let 主界面= window.parent.document
    let id = event?.currentTarget?.getAttribute("data-id") ?? paramId;
    // 处理笔记本等无法跳转的情况
    if (!isValidStr(id)) {return;}
    event?.preventDefault();
    event?.stopPropagation();
    let 虚拟链接 =  主界面.createElement("span")
    虚拟链接.setAttribute("data-type","block-ref")
    虚拟链接.setAttribute("data-id",id)
    虚拟链接.style.display = "none";//不显示虚拟链接，防止视觉干扰
    let 临时目标 = 主界面.querySelector(".protyle-wysiwyg div[data-node-id] div[contenteditable]")
    临时目标.appendChild(虚拟链接);
    let clickEvent = new MouseEvent("click", {
        ctrlKey: event?.ctrlKey,
        shiftKey: event?.shiftKey,
        altKey: event?.altKey,
        bubbles: true
    });
    虚拟链接.dispatchEvent(clickEvent);
    虚拟链接.remove();
}


/*
LEVEL 0 忽略所有
LEVEL 1 仅Error
LEVEL 2 Err + Warn
LEVEL 3 Err + Warn + Info
LEVEL 4 Err + Warn + Info + Log
LEVEL 5 Err + Warn + Info + Log + Debug
*/
export function commonPushCheck() {
    if (window.top["OpaqueGlassDebugV2"] == undefined || window.top["OpaqueGlassDebugV2"][g_NAME] == undefined) {
        return g_DEBUG;
    }
    return window.top["OpaqueGlassDebugV2"][g_NAME];
}

export function isDebugMode() {
    return commonPushCheck() > g_DEBUG;
}

export function debugPush(str, ...args) {
    if (commonPushCheck() >= 5) {
        const date = new Date();
        const dateStr = `${date.toLocaleString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
        console.debug(`${g_FULLNAME}[D] ${dateStr} ${str}`, ...args);
    }
}

export function logPush(str, ...args) {
    if (commonPushCheck() >= 4) {
        const date = new Date();
        const dateStr = `${date.toLocaleString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
        console.log(`${g_FULLNAME}[L] ${dateStr} ${str}`, ...args);
    }
}

export function errorPush(str, ... args) {
    if (commonPushCheck() >= 1) {
        const date = new Date();
        const dateStr = `${date.toLocaleString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
        console.error(`${g_FULLNAME}[E] ${dateStr} ${str}`, ...args);
    }
}

export function warnPush(str, ... args) {
    const date = new Date();
        const dateStr = `${date.toLocaleString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    if (commonPushCheck() >= 2) {
        console.warn(`${g_FULLNAME}[W] ${dateStr} ${str}`, ...args);
    }
}