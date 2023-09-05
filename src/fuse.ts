
import { ItemType, Item, log, ExcludedURLs, PinyinPart, SearchMode } from './common';
import Fuse from 'fuse.js';
import { pinyin } from 'pinyin-pro';


const pinyin2char = new Map<string, string>([
    ['iu', 'q'],
    ['ei', 'w'],
    ['uan', 'r'],
    ['un', 'y'],
    ['sh', 'u'],
    ['ch', 'i'],
    ['uo', 'o'],
    ['ie', 'p'],
    ['ong', 's'],
    ['iong', 's'],
    ['ai', 'd'],
    ['en', 'f'],
    ['eng', 'g'],
    ['ang', 'h'],
    ['an', 'j'],
    ['ing', 'k'],
    ['uai', 'k'],
    ['iang', 'l'],
    ['uang', 'l'],
    ['ou', 'z'],
    ['ia', 'x'],
    ['ua', 'x'],
    ['ao', 'c'],
    ['zh', 'v'],
    ['ui', 'v'],
    ['in', 'b'],
    ['iao', 'n'],
    ['ian', 'm'],
]);

const fuseOptions = {
    // isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    minMatchCharLength: 2,
    // location: 0,
    // threshold: 0.6,
    // distance: 100,
    useExtendedSearch: true,
    ignoreLocation: true,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: [
        "initial_title",
        "pinyin_title",
        "shuangpin_title",
        "title",
        "url",
    ]
};

const fuse = new Fuse<Item>([], fuseOptions);

const Search = {
    init(data: any) {
        fuse.setCollection(data);
    },
    add(type: ItemType, id: string, title: string, url: string) {
        if (!url || ExcludedURLs.indexOf(url) >= 0) return;
        // let pinyin_title = pinyin(title, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('');
        // let initial_title = pinyin(title, { toneType: 'none', pattern: 'first', type: 'array', nonZh: 'consecutive' }).join('');
        const result = pinyin(title, { type: 'all', toneType: 'none', nonZh: 'consecutive' });
        log('result:', result)
        const initials = build_initials(result);
        const pinyins = build_pinyins(result);
        const shuangpins = build_shuangpins(result);
        let item: Item = {
            type: type,
            id: id,
            url: url,
            title: title,
            pinyin_title: pinyins,
            initial_title: initials,
            shuangpin_title: shuangpins,
        }
        log('adding:', item);
        fuse.add(item);
    },
    remove(typ: ItemType, id: string) {
        const removed = fuse.remove((doc: Item, idx: number): boolean => {
            if (doc.type == typ && id == doc.id) return true;
            return false;
        });
        log('removed docs:', removed);
    },
    search(q: string, limit: number, mode: SearchMode): Fuse.FuseResult<Item>[] {
        let s = q;
        if (mode == SearchMode.Strict) {
            s = q.split(' ').map((s: string): string => {return "'" + s}).join(' ');
        }
        log('searching:', s)
        return fuse.search(s, { limit });
    },

    // history
    add_history(h: chrome.history.HistoryItem) {
        if (!h.url || !h.visitCount || h.visitCount > 1) return;
        this.remove_history(h.id);
        this.add(ItemType.History, h.id, String(h.title), h.url);
    },
    remove_history(id: string) { this.remove(ItemType.History, id) },
    remove_histories(urls: string[] | undefined) {
        if (!urls) return;
        const removed = fuse.remove((doc: Item, idx: number): boolean => {
            if (doc.type == ItemType.History && urls.indexOf(doc.url) >= 0) return true;
            return false;
        });
        log('removed docs:', removed); 
    },

    // bookmarks
    add_bookmark(b: chrome.bookmarks.BookmarkTreeNode) {
        if (!b.url) return;
        this.add(ItemType.Bookmark, b.id, String(b.title), b.url);
    },
    update_bookmark(id: string, changeInfo: chrome.bookmarks.BookmarkChangeInfo) {
        this.remove_bookmark(id)
        if (!changeInfo.url) return
        this.add(ItemType.Bookmark, id, changeInfo.title, changeInfo.url)
    },
    remove_bookmark(id: string) {
        this.remove(ItemType.Bookmark, id)
    },

    // tabs
    add_tab(t: chrome.tabs.Tab) {
        if (!t.url && !t.title) return;
        this.add(ItemType.Tab, String(t.id), String(t.title), String(t.url))
    },
    update_tab(t: chrome.tabs.Tab, u: chrome.tabs.TabChangeInfo) {
        if (u.status != 'complete') return;
        this.remove(ItemType.Tab, String(t.id));
        this.add_tab(t);
    },
    remove_tab(id: number) { this.remove(ItemType.Tab, String(id)) },

}

function build_initials(parts: PinyinPart[]): string {
    if (!parts) return '';

    let s = ''
    for (const p of parts) {
        if (p.isZh) s += p.first;
    }
    return s;
}

function build_pinyins(parts: PinyinPart[]): string {
    if (!parts) return '';

    let s = ''
    for (const p of parts) {
        if (p.isZh) s += p.pinyin + '';
    }
    return s;
}

function build_shuangpins(parts: PinyinPart[]): string {
    if (!parts) return '';

    let s = ''
    for (const p of parts) {
        if (p.isZh) s += build_shuangpin(p) + ''
    }
    return s;
}

function build_shuangpin(p: PinyinPart): string {
    if (!p.isZh) return ''
    return pinyin2char_fn(p.initial) + pinyin2char_fn(p.final)
}

function pinyin2char_fn(s: string): string {
    if (s.length == 1 || !pinyin2char.has(s)) return s;
    return pinyin2char.get(s)!;
}


export { Item, Search };