const siyuan = require('siyuan');
const { serverApi } = require("siyuan");
const { Plugin, Menu, MenuItem } = siyuan;

class HierachyNavigatePlugin extends Plugin {
    el = null;

    tabOpenObserver =  null;

    constructor() {
        super();
        try {
            g_tabbarElement = window.siyuan?.layout?.centerLayout?.element?.querySelectorAll("[data-type='wnd'] ul.layout-tab-bar");
        }catch(err) {
            console.warn(err);
            g_tabbarElement = undefined;
        }
        if (g_tabbarElement == undefined) {
            g_isMobile = true;
        }
        console.log('HierarchyNavigatorPluginCreated');
        // ~~若思源设定非中文，则显示英文~~
        let siyuanLanguage;
        try{
            siyuanLanguage = window.top.siyuan.config.lang;
        }catch (err){
            console.warn("读取语言信息失败");
        }
        if (siyuanLanguage != "zh_CN" && siyuanLanguage != undefined) {
            language = en_US;
        }else {
            language = zh_CN;
        }
    }

    async onload() {
        let PLUGIN_SETTING = [
            new SettingProperty("font_size", ""),
            new SettingProperty("")
        
        ];
        // 设置语言（已在constructor完成）

        // 读取配置
        const settingCache = await this.loadStorage("settings.json");
        // 解析并载入配置
        let settingData = JSON.parse(settingCache);
        Object.assign(g_setting, g_setting_default);
        Object.assign(g_setting, settingData);
        // console.log("LOADED",settingData);
        // console.log("LOADED_R", g_setting);
        // 生成配置页面
        this.registerSettingRender((el) => {
            const hello = document.createElement('div');
            const settingForm = document.createElement("form");
            settingForm.setAttribute("name", CONSTANTS.PLUGIN_NAME);
            settingForm.innerHTML = generateSettingPanelHTML([
                new SettingProperty("fontSize", "NUMBER", [0, 1024]),
                new SettingProperty("sibling", "SWITCH", null),
                new SettingProperty("popupWindow", "SELECT", [
                    {value:0},
                    {value:1},
                    {value:2},
                ]),
                new SettingProperty("docMaxNum", "NUMBER", [0, 1024]),
                new SettingProperty("nameMaxLength", "NUMBER", [0, 1024]),
                new SettingProperty("icon", "SELECT", [
                    {value:0},
                    {value:1},
                    {value:2}]),
                new SettingProperty("linkDivider", "TEXT", null),
                new SettingProperty("docLinkClass", "TEXT", null),
                new SettingProperty("parentBoxCSS", "TEXTAREA", null),
                new SettingProperty("siblingBoxCSS", "TEXTAREA", null),
                new SettingProperty("childBoxCSS", "TEXTAREA", null),
                new SettingProperty("docLinkCSS", "TEXTAREA", null),
            ]);

            hello.appendChild(settingForm);
            el.appendChild(hello);
            hello.addEventListener('change', (event) => {
                // this.writeStorage('hello.txt', 'world' + Math.random().toFixed(2));
                console.log('CHANGED');
                let uiSettings = loadUISettings(settingForm);
                clearTimeout(g_saveTimeout);
                g_saveTimeout = setTimeout(()=>{
                    this.writeStorage(`settings.json`, JSON.stringify(uiSettings));
                    Object.assign(g_setting, uiSettings);
                    removeStyle();
                    setStyle();  
                    console.log("SAVED");
                }, CONSTANTS.SAVE_TIMEOUT);
            });
            g_writeStorage = this.writeStorage;
        });
        // 开始运行
        setObserver();
        setStyle()
    }

    onunload() {
        this.el && this.el.remove();
        removeObserver();
        removeStyle();
    }
}

module.exports = {
    default: HierachyNavigatePlugin,
};

/**
 * 全局变量
 */
let g_switchTabObserver; // 页签切换与新建监视器
let g_windowObserver; // 窗口监视器
const CONSTANTS = {
    RANDOM_DELAY: 300, // 插入挂件的延迟最大值，300（之后会乘以10）对应最大延迟3秒
    OBSERVER_RANDOM_DELAY: 500, // 插入链接、引用块和自定义时，在OBSERVER_RANDOM_DELAY_ADD的基础上增加延时，单位毫秒
    OBSERVER_RANDOM_DELAY_ADD: 100, // 插入链接、引用块和自定义时，延时最小值，单位毫秒
    OBSERVER_RETRY_INTERVAL: 1000, // 找不到页签时，重试间隔
    STYLE_ID: "hierarchy-navigate-plugin-style",
    ICON_ALL: 2,
    ICON_NONE: 0,
    ICON_CUSTOM_ONLY: 1,
    PLUGIN_NAME: "og_hierachy_navigate",
    SAVE_TIMEOUT: 900,
    CONTAINER_CLASS_NAME: "og-hierachy-navigate-doc-container", 
    PARENT_CONTAINER_ID: "og-hierachy-navigate-parent-doc-container",
    CHILD_CONTAINER_ID: "og-hierachy-navigate-children-doc-container",
    SIBLING_CONTAINER_ID: "og-hierachy-navigate-sibling-doc-container",
    INDICATOR_CLASS_NAME: "og-hierachy-navigate-doc-indicator",
    POP_NONE: 0,
    POP_LIMIT: 1,
    POP_ALL: 2,
}
let g_observerRetryInterval;
let g_observerStartupRefreshTimeout;
let g_TIMER_LABLE_NAME_COMPARE = "文档栏插件";
let g_tabbarElement = undefined;
let g_saveTimeout;
let g_writeStorage;
let g_isMobile = false;
let g_setting = {
    fontSize: null,
    parentBoxCSS: null,
    siblingBoxCSS: null,
    childBoxCSS: null,
    docLinkCSS: null,
    docLinkClass: "",
    icon: null, // 0禁用 1只显示设置图标的 2显示所有
    sibling: null, // 为true则在父文档不存在时清除
    nameMaxLength: null,// 文档名称最大长度 0不限制
    docMaxNum: null, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    linkDivider: null,
    popupWindow: null,
};
let g_setting_default = {
    fontSize: 12,
    parentBoxCSS: "",
    siblingBoxCSS: "",
    childBoxCSS: "",
    docLinkCSS: "",
    docLinkClass: "",
    icon: CONSTANTS.ICON_CUSTOM_ONLY, // 0禁用 1只显示设置图标的 2显示所有
    sibling: false, // 为true则在父文档不存在时清除
    nameMaxLength: 20,// 文档名称最大长度 0不限制
    docMaxNum: 512, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    limitPopUpScope: false,// 限制浮窗触发范围
    linkDivider: "",
    popupWindow: CONSTANTS.POP_LIMIT,
};
class SettingProperty {
    id;
    simpId;
    name;
    desp;
    type;
    limit;
    value;
    /**
     * 设置属性对象
     * @param {*} id 唯一定位id
     * @param {*} type 设置项类型
     * @param {*} limit 限制
     */
    constructor(id, type, limit, value = undefined) {
        this.id = `${CONSTANTS.PLUGIN_NAME}_${id}`;
        this.simpId = id;
        this.name = language[`setting_${id}_name`];
        this.desp = language[`setting_${id}_desp`];
        this.type = type;
        this.limit = limit;
        if (value) {
            this.value = value;
        }else{
            this.value = g_setting[this.simpId];
        }
    }
}


/**
 * 设置监视器Observer
 */
function setObserver() {
    if (g_isMobile) {
        g_switchTabObserver = new MutationObserver(async (mutationList) => {
            for (let mutation of mutationList) {
                // console.log("发现页签切换", mutation);
                setTimeout(async () => {
                    console.time(g_TIMER_LABLE_NAME_COMPARE);
                    try{
                        // TODO: 改为动态获取id
                        await main([mutation.target]);
                    }catch(err) {
                        console.error(err);
                    }
                    console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
                }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
            }
        });
        g_switchTabObserver.observe(window.document.querySelector(".protyle-background[data-node-id]"), {"attributes": true, "attributeFilter": ["data-node-id"]});
        console.log("MOBILE_LOADED");
        main();
        return;
    }
    g_switchTabObserver = new MutationObserver(async (mutationList) => {
        for (let mutation of mutationList) {
            // console.log("发现页签切换", mutation);
            setTimeout(async () => {
                console.time(g_TIMER_LABLE_NAME_COMPARE);
                try{
                    // TODO: 改为动态获取id
                    await main([mutation.target]);
                }catch(err) {
                    console.error(err);
                }
                console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
            }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
        }
    });
    g_windowObserver = new MutationObserver((mutationList) => {
        for (let mutation of mutationList) {
            // console.log("发现窗口变化", mutation);
            if (mutation.removedNodes.length > 0 || mutation.addedNodes.length > 0) {
                // console.log("断开Observer");
                // tabBarObserver.disconnect();
                g_switchTabObserver.disconnect();
                clearInterval(g_observerRetryInterval);
                g_observerRetryInterval = setInterval(observerRetry, CONSTANTS.OBSERVER_RETRY_INTERVAL);
            }
            
        }
        
    });
    g_observerRetryInterval = setInterval(observerRetry, CONSTANTS.OBSERVER_RETRY_INTERVAL);
    g_windowObserver.observe(window.siyuan.layout.centerLayout.element, {childList: true});
}
/**
 * 重试页签监听
 */
function observerRetry() {
    g_tabbarElement = window.siyuan.layout.centerLayout.element.querySelectorAll("[data-type='wnd'] ul.layout-tab-bar");
    if (g_tabbarElement.length > 0) {
        // console.log("重新监视页签变化");
        g_tabbarElement.forEach((element)=>{
            g_switchTabObserver.observe(element, {"attributes": true, "attributeFilter": ["data-activetime"], "subtree": true});
            
            // 重启监听后立刻执行检查
            if (element.children.length > 0) {
                g_observerStartupRefreshTimeout = setTimeout(async () => {
                    console.time(g_TIMER_LABLE_NAME_COMPARE);
                    try{
                        // TODO
                        await main(element.children);
                    }catch (err) {
                        console.error(err);
                    }
                    console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
                }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
            }
        });
        clearInterval(g_observerRetryInterval);
    }
}

function removeObserver() {
    g_switchTabObserver?.disconnect();
    g_windowObserver?.disconnect();
}

async function main(targets) {
    // 获取当前文档id
    const docId = getCurrentDocIdF();
    // 防止重复执行
    if (window.document.querySelector(`.protyle-title[data-node-id="${docId}"] #og-hn-heading-docs-container`) != null) return;
    if (docId == null) {
        console.warn("未能读取到打开文档的id");
        return ;
    }
    // 获取文档相关信息
    const [parentDoc, childDoc, siblingDoc] = await getDocumentRelations(docId);
    console.log(parentDoc, childDoc, siblingDoc);
    // 生成插入文本
    const htmlElem = generateText(parentDoc, childDoc, siblingDoc, docId);
    console.log("FIN",htmlElem);
    // 应用插入
    setAndApply(htmlElem, docId);
}

/**
 * 获取文档相关信息：父文档、同级文档、子文档
 */
async function getDocumentRelations(docId) {
    let sqlResult = await serverApi.sql(`SELECT * FROM blocks WHERE id = "${docId}"`);
     // 获取父文档
    let parentDoc = await getParentDocument(docId, sqlResult);
    
    // 获取子文档
    let childDocs = await getChildDocuments(docId, sqlResult);

    let noParentFlag = false;
    if (parentDoc.length == 0) {
        noParentFlag = true;
    }
    // 获取同级文档
    let siblingDocs = await getSiblingDocuments(docId, parentDoc, sqlResult, noParentFlag);

    // 超长部分裁剪
    if (childDocs.length > g_setting.docMaxNum && g_setting.docMaxNum != 0) {
        childDocs = childDocs.slice(0, g_setting.docMaxNum);
    }
    if (siblingDocs.length > g_setting.docMaxNum && g_setting.docMaxNum != 0) {
        siblingDocs = siblingDocs.slice(0, g_setting.docMaxNum);
    }

    // 返回结果
    return [ parentDoc, childDocs, siblingDocs ];
}

async function getParentDocument(docId, sqlResult) {
    let splitText = sqlResult[0].path.split("/");
    if (splitText.length <= 2) return [];
    let parentSqlResult = await serverApi.sql(`SELECT * FROM blocks WHERE id = "${splitText[splitText.length - 2]}"`);
    return parentSqlResult;
}

async function getChildDocuments(docId, sqlResult) {
    let childDocs = await listDocsByPath({path: sqlResult[0].path, notebook: sqlResult[0].box});
    return childDocs.files;
}

async function getSiblingDocuments(docId, parentSqlResult, sqlResult, noParentFlag) {
    let siblingDocs = await listDocsByPath({path: noParentFlag ? "/" : parentSqlResult[0].path, notebook: sqlResult[0].box});
    return siblingDocs.files;
}



/**
 * 生成插入文本
 */
function generateText(parentDoc, childDoc, siblingDoc, docId) {
    let htmlElem = document.createElement("div");
    htmlElem.setAttribute("id", "og-hn-heading-docs-container");
    htmlElem.style.fontSize = `${g_setting.fontSize}px`;
    let parentElem = document.createElement("div");
    parentElem.setAttribute("id", CONSTANTS.PARENT_CONTAINER_ID);
    parentElem.style.padding = "0px 6px";
    let parentElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">${language["parent_nodes"]}</span>`;
    let parentFlag = false;
    for (let doc of parentDoc) {
        parentElemInnerText += docLinkGenerator(doc);
        parentFlag = true;
    }
    let siblingElem = document.createElement("div");
    siblingElem.setAttribute("id", CONSTANTS.SIBLING_CONTAINER_ID);
    siblingElem.style.padding = "0px 6px";
    let siblingElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">${language["sibling_nodes"]}</span>`;

    if (parentFlag) {
        parentElem.innerHTML = parentElemInnerText;
        htmlElem.appendChild(parentElem);
    }else if (g_setting.sibling){
        for (let doc of siblingDoc) {
            siblingElemInnerText += docLinkGenerator(doc);
        }
        if (siblingElemInnerText != `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">${language["sibling_nodes"]}</span>`) {
            siblingElem.innerHTML = siblingElemInnerText;
            htmlElem.appendChild(siblingElem);
        }else{
            siblingElem.innerHTML = siblingElemInnerText + language["none"];
            htmlElem.appendChild(siblingElem);
        }
        
    }else{
        parentElem.innerHTML = parentElemInnerText + language["none"];
        htmlElem.appendChild(parentElem);
    }
    let childElem = document.createElement("div");
    childElem.setAttribute("id", CONSTANTS.CHILD_CONTAINER_ID);
    
    childElem.style.padding = "0px 6px";
    let childElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">${language["child_nodes"]}</span>`;
    let childFlag = false;
    for (let doc of childDoc) {
        childElemInnerText += docLinkGenerator(doc);
        childFlag = true;
    }
    if (childFlag) {
        childElem.innerHTML = childElemInnerText;
        htmlElem.appendChild(childElem);
    }else{
        childElem.innerHTML = childElemInnerText + language["none"];
        htmlElem.appendChild(childElem);
    }
    
    parentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    siblingElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    childElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    
    return htmlElem;
    function docLinkGenerator(doc) {
        let emojiStr = getEmojiHtmlStr(doc.icon, doc?.subFileCount != 0);
        let docName = isValidStr(doc?.name) ? doc.name.substring(0, doc.name.length - 3) : doc.content;
        let trimDocName = docName;
        // 文件名长度限制
        if (docName.length > g_setting.nameMaxLength && g_setting.nameMaxLength != 0) trimDocName = docName.substring(0, g_setting.nameMaxLength) + "...";
        let result = "";
        switch (parseInt(g_setting.popupWindow)) {
            case CONSTANTS.POP_ALL: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "": escapeClass(g_setting.docLinkClass)}"
                    data-type='block-ref'
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                        ${emojiStr}${trimDocName}
                    </span>`
                break;
            }
            case CONSTANTS.POP_LIMIT:{
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px; display: inline-block"
                    title="${docName}"
                    data-id="${doc.id}">
                        <span data-type='block-ref'
                        data-subtype="d"
                        data-id="${doc.id}"
                        >${emojiStr}</span><span>${trimDocName}</span>
                    </span>`
                break;
            }
            case CONSTANTS.POP_NONE: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"

                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                        ${emojiStr}${trimDocName}
                    </span>`
                break;
            }
            default: {
                console.warn("WARN数据格式不正常");
                g_setting.icon = g_setting_default.icon;
                g_writeStorage("settings.json", JSON.stringify(g_setting));
            }
        }
        return result;
        function escapeClass(val) {
            return val.replaceAll(`"`, "");
        }
    }
}

function setAndApply(htmlElem, docId) {
    if (g_isMobile) {
        window.document.querySelector(`.protyle-background ~ #og-hn-heading-docs-container`)?.remove();
        // if (window.document.querySelector(`.protyle-background[data-node-id="${docId}"] #og-hn-heading-docs-container`) != null) return;
        htmlElem.style.paddingLeft = "24px";
        htmlElem.style.paddingRight = "16px";
        htmlElem.style.paddingTop = "16px";
        window.document.querySelector(`.fn__flex-column .protyle-background[data-node-id="${docId}"]`).insertAdjacentElement("afterend", htmlElem);
        [].forEach.call(window.document.querySelectorAll(`#og-hn-heading-docs-container span.refLinks`), (elem)=>{
            elem.addEventListener("click", openRefLink);
        });
        console.log("SETED_MOBILE");
        return;
    }
    if (window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title #og-hn-heading-docs-container`) != null) return;
    // if (window.document.querySelector(`.protyle-title[data-node-id="${docId}"] #og-hn-heading-docs-container`) != null) return;
    window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title`)?.append(htmlElem);
    [].forEach.call(window.document.querySelectorAll(`#og-hn-heading-docs-container  span.refLinks`), (elem)=>{
        elem.addEventListener("click", openRefLink);
        elem.style.marginRight = "10px";
    });
}

function setStyle() {
    const head = document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.setAttribute("id", CONSTANTS.STYLE_ID);
    const defaultLinkStyle = `
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper{
        background-color: var(--b3-protyle-inline-code-background);/*--b3-protyle-code-background  --b3-theme-surface-light*/
        color: var(--b3-protyle-inline-code-color);
        line-height: ${g_setting.fontSize + 2}px;
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        padding: 4px 6px;
        border-radius: ${(g_setting.fontSize + 2)}px;
        transition: var(--b3-transition);
        margin-right: 10px;
        margin-bottom: 3px;
    }`;

    style.innerHTML = `
    #og-hn-heading-docs-container span.docLinksWrapper:hover {
        cursor: pointer;
        box-shadow: 0 0 2px var(--b3-list-hover);
        opacity: .86;
        /*background-color: var(--b3-toolbar-hover);*/
        /*text-decoration: underline;*/
    }
    .${CONSTANTS.CONTAINER_CLASS_NAME} {
        text-align: left;
    }
    ${g_setting.docLinkCSS == g_setting_default.docLinkCSS && g_setting.docLinkClass == g_setting_default.docLinkClass? defaultLinkStyle:""}
    #${CONSTANTS.PARENT_CONTAINER_ID} {${styleEscape(g_setting.parentBoxCSS)}}

    #${CONSTANTS.CHILD_CONTAINER_ID} {${styleEscape(g_setting.childBoxCSS)}}

    #${CONSTANTS.SIBLING_CONTAINER_ID} {${styleEscape(g_setting.siblingBoxCSS)}}

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper {${styleEscape(g_setting.docLinkCSS)}}
    `;
    head.appendChild(style);
}

function styleEscape(str) {
    return str.replace(new RegExp("<[^<]*style[^>]*>", "g"), "");
}

function removeStyle() {
    document.getElementById(CONSTANTS.STYLE_ID)?.remove();
}

/**
 * 在html中显示文档icon
 * @param {*} iconString files[x].icon
 * @param {*} hasChild 
 * @returns 
 */
function getEmojiHtmlStr(iconString, hasChild) {
    if (g_setting.icon == CONSTANTS.ICON_NONE) return g_setting.linkDivider;
    // 无emoji的处理
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_ALL) return hasChild ? "📑" : "📄";//无icon默认值
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_CUSTOM_ONLY) return g_setting.linkDivider;
    let result = iconString;
    // emoji地址判断逻辑为出现.，但请注意之后的补全
    if (iconString.indexOf(".") != -1) {
        result = `<img class="iconpic" style="width: ${g_setting.fontSize}px" src="/emojis/${iconString}"/>`;
    } else {
        result = `<span class="emojitext">${emojiIconHandler(iconString, hasChild)}</span>`;
    }
    return result;
}
let emojiIconHandler = function (iconString, hasChild = false) {
    //确定是emojiIcon 再调用，printer自己加判断
    try {
        let result = "";
        iconString.split("-").forEach(element => {
            result += String.fromCodePoint("0x" + element);
        });
        return result;
    } catch (err) {
        console.error("emoji处理时发生错误", iconString, err);
        return hasChild ? "📑" : "📄";
    }
}

async function request(url, data) {
    let resData = null;
    await fetch(url, {
        body: JSON.stringify(data),
        method: 'POST',
        headers: {
            Authorization: `Token ${config().token}`,
        },
    }).then(function (response) {
        resData = response.json();
    });
    return resData;
}

async function parseBody(response) {
    let r = await response;
    return r.code === 0 ? r.data : null;
}

async function listDocsByPath({path, notebook = undefined, sort = undefined, maxListLength = undefined}) {
    let data = {
        path: path
    };
    if (notebook) data["notebook"] = notebook;
    if (sort) data["sort"] = sort;
    if (g_setting.docMaxNum != 0) {
        data["maxListCount"] = g_setting.docMaxNum >= 32 ? g_setting.docMaxNum : 32;
    } else {
        data["maxListCount"] = 0;
    }
    let url = '/api/filetree/listDocsByPath';
    return parseBody(request(url, data));
    //文档hepath与Markdown 内容
}

function getCurrentDocIdF() {
    let thisDocId;
    thisDocId = window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
    if (!thisDocId) {
        thisDocId = window.top.document.querySelector(".protyle-background")?.getAttribute("data-node-id");
    }
    return thisDocId;
}

/**
 * 在点击<span data-type="block-ref">时打开思源块/文档
 * 为引入本项目，和原代码相比有更改
 * @refer https://github.com/leolee9086/cc-template/blob/6909dac169e720d3354d77685d6cc705b1ae95be/baselib/src/commonFunctionsForSiyuan.js#L118-L141
 * @license 木兰宽松许可证
 * @param {点击事件} event 
 */
let openRefLink = function(event, paramId = ""){
    
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

function isValidStr(s){
    if (s == undefined || s == null || s === '') {
		return false;
	}
	return true;
}

let zh_CN = {
    "parent_nodes": "父：",
    "child_nodes": "子：",
    "sibling_nodes": "兄：",
    "none": "无",
    "setting_fontSize_name": "字号",
    "setting_fontSize_desp": "单位：px",
    "setting_nameMaxLength_name": "文档名最大长度",
    "setting_nameMaxLength_desp": "文档名超出的部分将被删除。设置为0则不限制。",
    "setting_docMaxNum_name": "文档最大数量",
    "setting_docMaxNum_desp": "当子文档或同级文档超过该值时，后续文档将不再显示。设置为0则不限制。",
    "setting_icon_name": "文档图标",
    "setting_icon_desp": "控制文档图标显示与否",
    "setting_sibling_name": "文档上级为笔记本时，显示同级文档",
    "setting_docLinkClass_name": "文档链接样式Class",
    "setting_docLinkClass_desp": "文档链接所属的CSS class，用于套用思源已存在的样式类。例：<code>b3-chip b3-chip--middle b3-chip--pointer</code>",
    "setting_popupWindow_name": "浮窗触发范围",
    "setting_docLinkCSS_name": "链接样式CSS",
    "setting_docLinkCSS_desp": "设置后，将同时禁用默认样式。您也可以在代码片段中使用选择器<code>.og-hierachy-navigate-doc-container span.docLinksWrapper</code>部分覆盖样式",
    "setting_childBoxCSS_name": "子文档容器CSS",
    "setting_parentBoxCSS_name": "父文档容器CSS",
    "setting_siblingBoxCSS_name": "同级文档容器CSS",
    "setting_parentBoxCSS_desp": "如果不修改，请留空。",
    "setting_childBoxCSS_desp": "如果不修改，请留空。",
    "setting_siblingBoxCSS_desp": "如果不修改，请留空。",
    "setting_linkDivider_name": "禁用图标时文档名前缀",
    "setting_linkDivider_desp": "在没有图标的文档链接前，加入该前缀。浮窗设置为“仅图标触发”时，前缀也用于触发浮窗。",
    "setting_icon_option_0": "不显示",
    "setting_icon_option_1": "仅自定义",
    "setting_icon_option_2": "显示全部",
    "setting_popupWindow_option_0": "不触发",
    "setting_popupWindow_option_1": "仅图标触发",
    "setting_popupWindow_option_2": "全部触发"
}

let en_US = {
    "parent_nodes": "Parent: ",
    "child_nodes": "Children: ",
    "sibling_nodes": "Sibling: ",
    "none": "N/A",
    "setting_fontSize_name": "Font Size",
    "setting_fontSize_desp": "Unit: px",
    "setting_nameMaxLength_name": "Maximum length of the document name",
    "setting_nameMaxLength_desp": "The excess part of the document name will be hided. If set to 0, there is no limit.",
    "setting_docMaxNum_name": "Maximum number of documents",
    "setting_docMaxNum_desp": "When a subdocument or sibling document exceeds this value, subsequent documents are not displayed. If set to 0, there is no limit.",
    "setting_icon_name": "Document Icon",
    "setting_icon_desp": "Controls whether the document icon is displayed",
    "setting_sibling_name": "Display sibling documents",
    "setting_sibling_desp": "When the parent document is a notebook, the sibling document is displayed",
    "setting_docLinkClass_name": "Document link style Class",
    "setting_docLinkClass_desp": "The CSS class to which the document link belongs is used to apply siyuan's existing style class. e.g.<code>b3-chip b3-chip--middle b3-chip--pointer</code>",
    "setting_popupWindow_name": "Set popup window trigger range",
    "setting_popupWindow_desp": "The floating window(popup window) is triggered when the mouse hovers over the area",
    "setting_docLinkCSS_name": "Link style CSS",
    "setting_docLinkCSS_desp": "Once set, the default style is also disabled",
    "setting_childBoxCSS_name": "Subdocument container CSS",
    "setting_parentBoxCSS_name": "Parent document container CSS",
    "setting_siblingBoxCSS_name": "Sibling document container CSS",
    "setting_parentBoxCSS_desp": "If no modification, please leave it blank",
    "setting_siblingBoxCSS_desp": "If no modification, please leave it blank ",
    "setting_childBoxCSS_desp": "If no modification, please leave it blank ",
    "setting_linkDivider_name": "Document name prefix",
    "setting_linkDivider_desp": "This prefix would be added before a document link without an icon. When \"popup window trigger range\" set as \"Icon only\", prefix also used to trigger it.",
    "setting_icon_option_0": "Hide all",
    "setting_icon_option_1": "Custom only",
    "setting_icon_option_2": "Show all",
    "setting_popupWindow_option_0": "Do not set trigger",
    "setting_popupWindow_option_1": "Icon only",
    "setting_popupWindow_option_2": "Icon and link text",
}
let language = zh_CN;

/**
 * 由需要的设置项生成设置页面
 * @param {*} settingObject 
 */
function generateSettingPanelHTML(settingObjectArray) {
    let resultHTML = "";
    for (let oneSettingProperty of settingObjectArray) {
        let inputElemStr = "";
        oneSettingProperty.desp = oneSettingProperty.desp?.replace(new RegExp("<code>", "g"), "<code class='fn__code'>");
        let temp = `
        <label class="fn__flex b3-label">
            <div class="fn__flex-1">
                ${oneSettingProperty.name}
                <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
            </div>
            <span class="fn__space"></span>
            *#*##*#*
        </label>
        `;
        switch (oneSettingProperty.type) {
            case "NUMBER": {
                let min = oneSettingProperty.limit[0];
                let max = oneSettingProperty.limit[1];
                inputElemStr = `<input 
                    class="b3-text-field fn__flex-center fn__size200" 
                    id="${oneSettingProperty.id}" 
                    type="number" 
                    name="${oneSettingProperty.simpId}"
                    ${min == null || min == undefined ? "":"min=\"" + min + "\""} 
                    ${max == null || max == undefined ? "":"max=\"" + max + "\""} 
                    value="${oneSettingProperty.value}">`;
                break;
            }
            case "SELECT": {

                let optionStr = "";
                for (let option of oneSettingProperty.limit) {
                    let optionName = option.name;
                    if (!optionName) {
                        optionName = language[`setting_${oneSettingProperty.simpId}_option_${option.value}`];
                    }
                    optionStr += `<option value="${option.value}" 
                    ${option.value == oneSettingProperty.value ? "selected":""}>
                        ${optionName}
                    </option>`;
                }
                inputElemStr = `<select 
                    id="${oneSettingProperty.id}" 
                    name="${oneSettingProperty.simpId}"
                    class="b3-select fn__flex-center fn__size200">
                        ${optionStr}
                    </select>`;
                break;
            }
            case "TEXT": {
                inputElemStr = `<input class="b3-text-field fn__flex-center fn__size200" id="${oneSettingProperty.id}" name="${oneSettingProperty.simpId}" value="${oneSettingProperty.value}"></input>`;
                temp = `
                <label class="fn__flex b3-label config__item">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                    </div>
                    *#*##*#*
                </label>`
                break;
            }
            case "SWITCH": {
                inputElemStr = `<input 
                class="b3-switch fn__flex-center"
                name="${oneSettingProperty.simpId}"
                id="${oneSettingProperty.id}" type="checkbox" 
                ${oneSettingProperty.value?"checked=\"\"":""}></input>
                `;
                break;
            }
            case "TEXTAREA": {
                inputElemStr = `<textarea 
                name="${oneSettingProperty.simpId}"
                class="b3-text-field fn__block" 
                id="${oneSettingProperty.id}">${oneSettingProperty.value}</textarea>`;
                temp = `
                <label class="b3-label fn__flex">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                        <div class="fn__hr"></div>
                        *#*##*#*
                    </div>
                </label>`
                break;
            }
        }
        
        resultHTML += temp.replace("*#*##*#*", inputElemStr);
    }
    // console.log(resultHTML);
    return resultHTML;
}

/**
 * 由配置文件读取配置
 */
function loadCacheSettings() {
    // 检索当前页面所有设置项元素

}

/**
 * 由设置界面读取配置
 */
function loadUISettings(formElement) {
    let data = new FormData(formElement);
    // 扫描标准元素 input[]
    let result = {};
    for(const [key, value] of data.entries()) {
        // console.log(key, value);
        result[key] = value;
        if (value === "on") {
            result[key] = true;
        }else if (value === "null" || value == "false") {
            result[key] = "";
        }
    }
    let checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        let checkbox = checkboxes[i];
        // console.log(checkbox, checkbox.name, data[checkbox.name], checkbox.name);
        if (result[checkbox.name] == undefined) {
            result[checkbox.name] = false;
        }
    }

    let numbers = formElement.querySelectorAll("input[type='number']");
    // console.log(numbers);
    for (let number of numbers) {
        result[number.name] = parseFloat(number.value);
    }

    console.log("UI SETTING", result);
    return result;
}