
import {
    DefaultResultsMaxNum, ItemType, ContentTabPrefix,
    log, mustString, format_content, format_description, set_current_tab_url,
    parseTabId, gotoTab, isValidUrl, SearchMode,
    Message, MessageType,
} from './common'
import { Item, Search } from './fuse'


log(`service worker reloaded`)
chrome.runtime.onInstalled.addListener(details => {
    log('onInstalled:', details)
    chrome.storage.sync.set({
        limit: DefaultResultsMaxNum,
        search_mode: SearchMode.Strict,
    })
})

// ==== History =========================================================================================

const oneYearAgo = (new Date).getTime() - 365 * 24 * 3600 * 1000;
chrome.history.search(
    {
        'text': '', // all history
        'startTime': oneYearAgo,
        'maxResults': 100000,
    },
    (items) => {
        items.forEach(item => {
            Search.add_history(item);
        });
        log(`${items.length} history loaded`)
    },
);

chrome.history.onVisited.addListener((item: chrome.history.HistoryItem) => {
    log(`history.onVisited:`, item)
    Search.add_history(item);
})

chrome.history.onVisitRemoved.addListener((item: chrome.history.RemovedResult) => {
    log('history.onVisitRemoved:', item)
    Search.remove_histories(item.urls)
})

// ==== Bookmarks =========================================================================================

chrome.bookmarks.getTree((results: chrome.bookmarks.BookmarkTreeNode[]) => {
    let n = 0;
    dfs_bookmark_tree(results, function (node: chrome.bookmarks.BookmarkTreeNode) {
        Search.add(ItemType.Bookmark, node.id, mustString(node.title), mustString(node.url))
        n++;
    })
    log(`${n} bookmarks loaded`)
})

function dfs_bookmark_tree(nodes: chrome.bookmarks.BookmarkTreeNode[], fn: (node: chrome.bookmarks.BookmarkTreeNode) => void) {
    nodes.forEach((node) => {
        fn(node)
        if (node.children) {
            dfs_bookmark_tree(node.children, fn)
        }
    })
}

chrome.bookmarks.onRemoved.addListener((id: string, removeInfo: chrome.bookmarks.BookmarkRemoveInfo): void => {
    log('bookmarks.onRemoved:', id, removeInfo)
    Search.remove_bookmark(id)
})

// ==== Tabs =========================================================================================

chrome.tabs.query({}, function (tabs: chrome.tabs.Tab[]) {
    tabs.forEach(function (tab: chrome.tabs.Tab) {
        Search.add(ItemType.Tab, String(tab.id), mustString(tab.title), mustString(tab.url))
    })
    log(`${tabs.length} tabs loaded`)
})

chrome.tabs.onCreated.addListener(function (tab: chrome.tabs.Tab) {
    log(`tabs.onCreated:`, tab)
    // Search.add_tab(tab)
})

chrome.tabs.onRemoved.addListener(function (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
    log(`tabs.onRemoved:`, tabId, removeInfo)
    Search.remove_tab(tabId)
})

chrome.tabs.onUpdated.addListener(function (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
    log(`tabs.onUpdated:`, tabId, changeInfo, tab)
    Search.update_tab(tab, changeInfo)
})

// ==== Omnibox =========================================================================================


var firstMatchItem: Item | undefined;

chrome.omnibox.onInputStarted.addListener(() => {
    log("omnibox.onInputStarted")
})

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    log("omnibox.onInputChanged:", text)
    if (!text) {
        firstMatchItem = undefined;
        chrome.omnibox.setDefaultSuggestion({ description: '输入拼音，开始搜索历史记录、书签、标签页' });
        return;
    }

    chrome.storage.sync.get(['limit', 'search_mode']).then((result) => {

        const results = Search.search(text, result.limit, result.search_mode);
        log('results:', results)

        let l: chrome.omnibox.SuggestResult[] = [];
        for (let i = 0; i < results.length; i++) {
            let item = results[i].item;
            if (!item.title || !item.url) continue

            // set the first match item
            if (i == 0) {
                firstMatchItem = item;
                chrome.omnibox.setDefaultSuggestion({ description: format_description(item) });
                log('default:', item);
            } else {
                l.push({
                    content: format_content(item),
                    description: format_description(item),
                })
            }
        }
        log('suggestions:', l);

        suggest(l);
    })
})

chrome.omnibox.onInputEntered.addListener((text) => {
    log("omnibox.onInputEntered:", text)

    if (isValidUrl(text)) { set_current_tab_url(text); return }

    // Tab#123
    if (text.startsWith(ContentTabPrefix)) {
        const tabId = parseTabId(text);
        if (tabId > 0) gotoTab(tabId);
        return;
    }

    // Default suggestion
    chrome.storage.sync.get(['limit', 'search_mode']).then((result) => {

        const results = Search.search(text, result.limit, result.search_mode);
        if (!results) return

        const first = results[0]
        const item = first.item;
        if (item.type == 1 || item.type == 2) { set_current_tab_url(item.url); return; }

        gotoTab(parseInt(item.id))
    })
});

chrome.omnibox.onInputCancelled.addListener(() => {
    log('omnibox.onInputCancelled')
    firstMatchItem = undefined;
})


// ==== Helpers =========================================================================================

chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    log('onMessage:', message, sender);
    if (message.type == 'SEARCH') {
        const query = message.data.query;
        chrome.storage.sync.get(['limit', 'search_mode']).then((result) => {
            const results = Search.search(query, result.limit, result.search_mode);
            log('results:', results)
            sendResponse({data: { results: results}})
        })
        return true;
    }
})