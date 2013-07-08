var bg = chrome.extension.getBackgroundPage();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-35571910-3']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

document.ready = function() {
    $('#loading').spin({ 'lines': 10, 'length': 6, 'width': 3, 'radius': 7, 'color': '#444444' });

    var devices, sharedDevices, activeTab;
    bg.getDevices(function(response) {
        if (response == null) {
            showUi(false);
        } else {
            devices = response.devices.concat(response.shared_devices);
            sharedDevices = response.shared_devices
            fillDeviceSelect(response.devices, response.shared_devices);
            showUi(true, response.devices, response.shared_devices);
        }
    });

    bg.getPageInfo(function(pageInfo) {
        $('#link_title').val(pageInfo.title);
        $('#link_url').val(pageInfo.url);
        $('#note_body').val(pageInfo.selection);
    });

    $('#devices').change(function() {
        var index = $('#devices').get(0).selectedIndex;
        var device = devices[index >= 0 ? index : 0];

        $('.tab_list').css('display', 'none');
        $('.tab_file').css('display', 'none');
        $('.tab_link').css('display', 'none');

        var version = device.extras.app_version;
        if (version >= 3) {
            $('.tab_list').css('display', 'block');
            if (version >= 4) {
                $('.tab_file').css('display', 'block');
                if (version >= 5) {
                    $('.tab_link').css('display', 'block');
                } else {
                    if (activeTab === 'link') {
                        $('.tab_note').click();
                    }
                }
            } else {
                if (activeTab === 'link' || activeTab === 'file') {
                    $('.tab_note').click();
                }
            }
        } else {
            if (activeTab === 'link' || activeTab === 'file' || activeTab === 'list') {
                $('.tab_note').click();
            }
        }
    });

    activeTab = 'link';

    $('.tab_link').click(function() {
        resetContent();
        activeTab = 'link';
        $('#push_link').css('display', 'block');
    });

    $('.tab_note').click(function() {
        resetContent();
        activeTab = 'note';
        $('#push_note').css('display', 'block');
    });

    $('.tab_list').click(function() {
        resetContent();
        activeTab = 'list';
        $('#push_list').css('display', 'block');
    });

    $('.tab_file').click(function() {
        resetContent();
        activeTab = 'file';
        $('#push_file').css('display', 'block');
    });

    $('#push_link_submit').click(function() {
        var title = $('#link_title').val();
        var url = $('#link_url').val();
        var device_id = $('#devices').val();

        if (url.length == 00)
            return;

        bg.sendPush({ 'type': 'link', 'device_id': device_id, 'title': title, 'url': url }, function() {
            window.close();
        });

        $('#push_link_submit').addClass('disabled');
        $('#push_link_submit').spin({ 'lines': 8, 'length': 4, 'width': 3, 'radius': 5, 'color': 'white' });
    });

    $('#push_note_submit').click(function() {
        var title = $('#note_title').val();
        var body = $('#note_body').val();
        var device_id = $('#devices').val();

        if (title.length == 0 && body.length == 00)
            return;

        bg.sendPush({ 'type': 'note', 'device_id': device_id, 'title': title, 'body': body }, function() {
            window.close();
        });

        $('#push_note_submit').addClass('disabled');
        $('#push_note_submit').spin({ 'lines': 8, 'length': 4, 'width': 3, 'radius': 5, 'color': 'white' });
    });

    $('#push_list_submit').click(function() {
        var title = $('#list_title').val();
        var device_id = $('#devices').val();
        var items = $('input[name="items\\[\\]"]').map(function(){ return $(this).val(); }).get();



        bg.sendPush({ 'type': 'list', 'device_id': device_id, 'title': title, 'items': items }, function() {
            window.close();
        });

        $('#push_list_submit').addClass('disabled');
        $('#push_list_submit').spin({ 'lines': 8, 'length': 4, 'width': 3, 'radius': 5, 'color': 'white' });
    });

    $('#push_file_submit').click(function() {
        var device_id = $('#devices').val();
        bg.openTab(bg.host + '/push/file?device_id=' + device_id);
    });

    $('#btn_add_item').click(function() {
        $('#item_container').append('<div class="controls"><input type="text" placeholder="List item" name="items[]" class="input-block-level"></div>');
    });

    $('#play_store_link').click(function() {
        bg.openTab('https://play.google.com/store/apps/details?id=com.pushbullet.android');
    });

    $('#sign_in').click(function() {
        bg.openTab(bg.host + '/signin');
    });

    $('#sign_up').click(function() {
        bg.openTab(bg.host + '/');
    });

    $('#sign_out').click(function() {
        bg.signOut();
        window.close();
    });
};

function fillDeviceSelect(devices, sharedDevices) {
    $('#devices').html('')

    if (devices !== null) {
        $('#devices').append($('<optgroup>').attr('label', 'My Devices'));

        for (var i = 0, n = devices.length; i < n; i++) {
            var device = devices[i];
            device.extras.manufacturer = device.extras.manufacturer.charAt(0).toUpperCase() + device.extras.manufacturer.slice(1);
            device.name = device.extras.nickname || device.extras.manufacturer + " " + device.extras.model

            $('#devices')
                .append($('<option>', { 'value' : device.id })
                .text(device.name))
        }

        $('#devices').change();
    }

    if (sharedDevices) {
        $('#devices').append($('<optgroup>').attr('label', 'Devices Shared with Me'));

        for (var i = 0, n = sharedDevices.length; i < n; i++) {
            var device = sharedDevices[i];
            device.extras.manufacturer = device.extras.manufacturer.charAt(0).toUpperCase() + device.extras.manufacturer.slice(1);
            device.name = device.extras.nickname || device.extras.manufacturer + " " + device.extras.model

            $('#devices')
                .append($('<option>', { 'value' : device.id })
                .text(device.owner_name + '\'s ' + device.name))
        }

        $('#devices').change();
    }
}

function resetContent() {
    $('#push_note').css('display', 'none');
    $('#push_link').css('display', 'none');
    $('#push_list').css('display', 'none');
    $('#push_file').css('display', 'none');
}

function showUi(signedIn, devices, sharedDevices) {
    $('#loading').spin(false);
    $('#loading').css('display', 'none')
    $('#content').css('display', 'block')

    if (signedIn) {
        if (devices.length > 0 || sharedDevices.length > 0) {
            showSignedInUi();
        } else {
            showNoDevicesUi();
        }
    } else {
        showSignInUi();
    }
}

function showSignedInUi() {
    $('.not_signed_in').css('display', 'none');
    $('.signed_in').css('display', 'block');
}

function showSignInUi() {
    $('.not_signed_in').css('display', 'block');
    $('.signed_in').css('display', 'none');
}

function showNoDevicesUi() {
    $('.no_devices').css('display', 'block');
}

$.fn.spin = function(opts) {
    this.each(function() {
        var $this = $(this),
            data = $this.data();

        if (data.spinner) {
            data.spinner.stop();
            delete data.spinner;
        }
        if (opts !== false) {
            data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
        }
    });
    return this;
};
