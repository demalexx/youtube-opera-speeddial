window.addEventListener('load', onLoad, false);

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

    function loadCallback(event) {
        var response_container = document.createElement('html');
        response_container.innerHTML = event.target.responseText;

        var items_els = response_container.querySelectorAll('ul.feed-list li.feed-list-item');
        var items = [];

        // There is room only for 7 items max
        for (var i = 0; i < Math.min(items_els.length, 6); i++) {
            var cur_item = items_els[i];

            var author = cur_item.querySelector('span.feed-item-owner a').getAttribute('title');
            var author_img_url = cur_item.querySelector('.feed-author-bubble-container .feed-item-author img').getAttribute('data-thumb');
            var title = cur_item.querySelector('h3 a').getAttribute('title');
            var thumb_url = cur_item.querySelector('.feed-item-main .video-thumb img').getAttribute('data-thumb');
            var duration = cur_item.querySelector('.context-data-item').getAttribute('data-context-item-time');
            var is_watched = Boolean(cur_item.querySelector('.feed-item-thumb.watched'));

            if (author_img_url.indexOf('//') == 0) {
                author_img_url = 'http:' + author_img_url;
            }

            if (thumb_url.indexOf('//') == 0) {
                thumb_url = 'http:' + thumb_url;
            }

            items.push({'author': author,
                        'author_img_url': author_img_url,
                        'title': title,
                        'thumb_url': thumb_url,
                        'duration': duration,
                        'is_watched': is_watched});
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
            out_html +=     '<td class="thumb-cell border-bottom ' + (cur_item['is_watched'] ? 'watched' : '') + '" rowspan="2">';
            out_html +=         '<div class="video-thumb-container">';
            out_html +=             '<img class="video-thumb" src="' + cur_item['thumb_url'] + '" />';
            out_html +=             '<span class="duration">' + cur_item['duration'] + '</span>';
            out_html +=         '</div>';
            out_html +=     '</td>';
            out_html +=     '<td class="author-cell">';
            out_html +=         '<span class="author">' + htmlEncode(cur_item['author']) + '</span>';
            out_html +=     '</td>';
            out_html +=     '<td class="author-icon-cell">';
            out_html +=         '<img class="author-icon" src="' + cur_item['author_img_url'] + '"/>';
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

    var xhr = new XMLHttpRequest();
    xhr.timeout = 15000;
    xhr.addEventListener('load', loadCallback, false);
    xhr.open('GET', 'http://www.youtube.com/feed/subscriptions', true);
    xhr.send();
}

function htmlEncode(text) {
    var div = document.createElement('div');
    var text_node = document.createTextNode(text);
    div.appendChild(text_node);
    return div.innerHTML;
}