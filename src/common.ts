


// 搜索结果最大数量
export const DefaultResultsMaxNum = 8;

// 搜索模式
export enum SearchMode {
    Strict = 1,
    Fuzzy = 2,
}

// 搜索类型
export enum ItemType {
    History = 1,
    Bookmark = 2,
    Tab = 3,
}

export const ItemTypes = [ItemType.Bookmark, ItemType.History, ItemType.Tab];

export const ItemType2TextMap = new Map<ItemType, string>([
    [ItemType.History, 'History'],
    [ItemType.Bookmark, 'Bookmark'],
    [ItemType.Tab, 'Tab'],
]);

// 每种类型对应的 utf-8 符号
export const Type2SymbolMap = new Map<ItemType, string>([
    [ItemType.History, '🕒'],
    [ItemType.Bookmark, '🔖'],
    [ItemType.Tab, '🔳'],
])

export const ContentTabPrefix = 'Tab#';


export interface Item {
    type: ItemType;
    id: string;
    url: string;
    title: string;
    pinyin_title: string;
    initial_title: string;
    shuangpin_title: string;
}

export interface PinyinPart {
    origin: string;
    pinyin: string;
    initial: string;
    final: string;
    num: number;
    first: string;
    finalHead: string;
    finalBody: string;
    finalTail: string;
    isZh: boolean;
}

export const ExcludedURLs = ['chrome://newtab/'];


export declare type MessageType = 'SEARCH';

export declare type Message<T = any> = {
    type: MessageType;
    data?: T;
};

export declare type ResponseType = 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNAUTHORIZED' | 'AUTHENTICATED';

export declare type Response<T = any> = {
    type: ResponseType;
    data?: T;
};


export function gotoTab(id: number) {
    chrome.tabs.update(id, { active: true });
}

export function parseTabId(text: string): number {
    text = text.substring(ContentTabPrefix.length);
    // log(text)
    const i = text.indexOf(' ');
    // log(text.substring(0, i))
    if (i < 0) return 0;
    try {
        const tabId = parseInt(text.substring(0, i));
        return tabId
    } catch (error) { }
    return 0;
}


export function set_current_tab_url(url: string) {
    let queryOptions = { active: true, lastFocusedWindow: true };
    chrome.tabs.query(queryOptions).then(([tab]) => {
        if (!tab || !tab.id) return;
        chrome.tabs.update(tab.id, { url: url })
    });
}

export function format_content(item: Item): string {
    if (item.type == 3) {
        return `${ContentTabPrefix}${item.id} ${item.title}`
    }
    return mustString(item.url)
}

export function format_description(item: Item): string {
    let name = Type2SymbolMap.get(item.type);
    if (!name) name = '';
    return `${name} ${escape_xml(item.title)} - <url>${escape_xml(item.url)}</url>`
}


export function escape_xml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c: string): string => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
}

function pad(n: number, width: number) {
    const z = '0';
    let s = n + '';
    return s.length >= width ? n : new Array(width - s.length + 1).join(z) + n;
}

export function log(message?: any, ...optionalParams: any[]) {
    const now = new Date();
    console.log(`${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}.${pad(now.getMilliseconds(), 3)}   ` + message, ...optionalParams)
}

export function mustString(s: string | undefined): string {
    if (!s) return ''
    return s;
}

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}