window.addEventListener('load', onLoad, false);

// Populate selectors with default data.
// selectors.json is main source of selectors.
// This dict is just a copy of selectors.json.
var SELECTORS = {
    "items_list": ".feed-item-container",
    "items_grid": ".yt-lockup-video",
    "is_items_list": {
        "css": ".feed-item-container .expanded-shelf",
        "type": "bool"
    },
    "author": {
        "css": ".yt-lockup-byline a"
    },
    "author_img_url": {
        "css": ".branded-page-module-title-link .video-thumb img",
        "attr": "src"
    },
    "is_author_img_url": {
        "css": ".branded-page-module-title-link .video-thumb img",
        "type": "bool"
    },
    "title": {
        "css": "h3.yt-lockup-title a"
    },
    "thumb_url": {
        "css": ".yt-lockup-video .video-thumb img",
        "attr": "src"
    },
    "duration": {
        "css": ".video-time"
    },
    "is_duration": {
        "css": ".video-time",
        "type": "bool"
    },
    "is_live": {
        "css": ".yt-badge-live",
        "type": "bool"
    },
    "scheduled_live": {
        "css": ".yt-badge.localized-date",
        "attr": "data-timestamp"
    },
    "is_scheduled_live": {
        "css": ".yt-badge.localized-date",
        "type": "bool"
    },
    "is_watched": {
        "css": ".watched-badge",
        "type": "bool"
    }
};

function onLoad() {
    tryUpdateData();
}

function switch_mode(mode) {
    // Reformat content depending on given mode:
    // d - disabled, e.g. when Youtube is unavailable, or user is not logged-in;
    // i - items, there are items to show.
    var center_logo = document.querySelector('#youtube-center-logo');
    var center_logo_img = center_logo.querySelector('img');
    var content = document.querySelector('#content');

    if (mode == 'd') {
        content.style.display = 'none';
        center_logo.style.display = 'block';
        center_logo_img.setAttribute('src', '/icons/youtube-logo-bw.png');
    }
    else if (mode == 'i') {
        center_logo.style.display = 'none';
        content.style.display = 'block';
    }
}

function tryUpdateData() {
    // Try to update data from Youtube and schedule update no matter what
    // happened (exceptions etc)

    try {
        updateData();
    }
    finally {
        setTimeout(tryUpdateData, 5 * 60 * 1000);
    }
}

function updateData() {
    // Get data from Youtube and refresh SpeedDial content

    // "subscriptions" URL without "flow" param returns last used layout.
    // Skip "flow" param to avoid overriding user's layout.
    var xhr = new XMLHttpRequest();
    xhr.timeout = 15000;
    xhr.addEventListener('load', loadCallback, false);
    xhr.open('GET', 'https://www.youtube.com/feed/subscriptions');
    xhr.responseType = 'document';
    xhr.send();

    function loadCallback(event) {
        // With `xhr.responseType = 'document'` `responseXML` is parsed HTML
        var response_container = event.target.responseXML;

        var items_els;

        // YouTube has 2 layouts - list and grid, process both
        if (executeSelector(response_container, 'is_items_list')) {
            items_els = executeSelector(response_container, 'items_list')
        }
        else {
            items_els = executeSelector(response_container, 'items_grid')
        }
        var items = [];

        // There is room only for few items on small speeddial block
        for (var i = 0; i < Math.min(items_els.length, 5); i++) {
            var cur_item = items_els[i];

            var author = executeSelector(cur_item, 'author');

            // Only list layout has channel image (author image)
            var author_img_url = '';
            if (executeSelector(cur_item, 'is_author_img_url')) {
                author_img_url = executeSelector(cur_item, 'author_img_url');
            }
            var title = executeSelector(cur_item, 'title');
            var thumb_url = executeSelector(cur_item, 'thumb_url');

            // Duration could be absent (live/scheduled live items)
            var duration = '';
            var is_live = false;
            if (executeSelector(cur_item, 'is_duration')) {
                duration = executeSelector(cur_item, 'duration');
            }
            else {
                if (executeSelector(cur_item, 'is_live')) {
                    duration = 'LIVE';
                    is_live = true;
                }
                else if (executeSelector(cur_item, 'is_scheduled_live')) {
                    var dt = new Date(
                        parseInt(
                            executeSelector(cur_item, 'scheduled_live')
                        ) * 1000
                    );

                    duration = dt.toLocaleString(
                        window.navigator.language, {
                            hour12: false,
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        }
                    ).toUpperCase();
                }
            }
            var is_watched = executeSelector(cur_item, 'is_watched');

            if (author_img_url.indexOf('//') == 0) {
                author_img_url = 'https:' + author_img_url;
            }

            if (thumb_url.indexOf('//') == 0) {
                thumb_url = 'https:' + thumb_url;
            }

            items.push({
                'author': author,
                'author_img_url': author_img_url,
                'title': title,
                'thumb_url': thumb_url,
                'duration': duration,
                'is_live': is_live,
                'is_watched': is_watched
            });
        }

        // Most likely user isn't logged-in
        if (items.length == 0) {
            switch_mode('d');
            return;
        }

        var out_html = '<table>';
        for (i = 0; i < items.length; i++) {
            cur_item = items[i];

            out_html += '<tr>';
            out_html +=     '<td rowspan="2" class="thumb-cell border-bottom ' + (cur_item['is_watched'] ? 'watched' : '') + '" rowspan="2">';
            out_html +=         '<div class="video-thumb-container">';
            out_html +=             '<img class="video-thumb" src="' + cur_item['thumb_url'] + '" />';
            out_html +=             '<span class="duration' + (cur_item['is_live'] ? ' live' : '') + '">' + cur_item['duration'] + '</span>';
            out_html +=         '</div>';
            out_html +=     '</td>';
            out_html +=     '<td class="author-cell">';
            out_html +=         '<span class="author">' + htmlEncode(cur_item['author']) + '</span>';
            out_html +=     '</td>';
            out_html +=     '<td class="author-icon-cell">';
            if (cur_item['author_img_url']) {
                out_html += '<img class="author-icon" src="' + cur_item['author_img_url'] + '"/>';
            }
            out_html +=     '</td>';
            out_html += '</tr>';

            out_html += '<tr>';
            out_html +=     '<td class="title-cell border-bottom " colspan="2">';
            out_html +=         '<span class="title">' + htmlEncode(cur_item['title']) + '</span>';
            out_html +=     '</td>';
            out_html += '</tr>';
        }
        out_html += '</table>';

        var output = document.querySelector('#content');
        output.innerHTML = out_html;
        switch_mode('i');
    }
}

function loadSelectors() {
    // Try to load selectors from external resource

    var xhr = new XMLHttpRequest();
    xhr.timeout = 15000;
    xhr.addEventListener('load', loadCallback, false);
    xhr.open('GET', 'https://demalexx.github.io/youtube-opera-speeddial/selectors.json');
    xhr.send();

    function loadCallback(event) {
        try {
            var selectors = JSON.parse(event.target.responseText);
        }
        catch (e) {
            return;
        }

        SELECTORS = selectors;
    }
}

function executeSelector(item, sel_key) {
    // Use selector rules named `sel_key` to get data from `item`.
    // If data can't be found it'll get new selectors from external resource

    var sel_data = SELECTORS[sel_key];
    var res;

    var css;
    var is_data_found = false;

    if (typeof sel_data == 'string' || sel_data instanceof String) {
        css = sel_data;
        res = item.querySelectorAll(css);

        // Most likely no items exist because selector failed. Then need
        // to update them. It also could be because user isn't logged-in.
        is_data_found = (res.length > 0);
    }
    else {
        css = sel_data['css'];
        var attr = sel_data['attr'];
        var is_bool = (sel_data['type'] === 'bool');

        var el = item.querySelector(css);

        if (is_bool) {
            return Boolean(el);
        }

        try {
            if (attr) {
                res = el.getAttribute(attr);
            }
            else {
                res = el.innerText;
            }

            is_data_found = Boolean(res);
        }
        catch (e) {
            is_data_found = false;
        }
    }

    if (!is_data_found) {
        var msg = "Selector can't find " + sel_key + ' (' + css + ')';
        loadSelectors();

        // Raise exception so caller method stops executing
        throw msg;
    }

    return res;
}

function htmlEncode(text) {
    var div = document.createElement('div');
    var text_node = document.createTextNode(text);
    div.appendChild(text_node);
    return div.innerHTML;
}