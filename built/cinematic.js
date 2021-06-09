var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Cinematic = /** @class */ (function () {
    function Cinematic(options) {
        this.defaults = {
            selector: '',
            poster: '',
            subtitles: '',
            autoplay: false,
            startTime: 0,
            deeplink: '',
            translations: {
                pause: 'Pause',
                play: 'Play',
                restart: 'Restart',
                mute: 'Mute',
                unmute: 'Unmute',
                quality: 'Quality',
                fullscreen: 'Fullscreen',
                deeplink: 'Copy deeplink to clipboard',
                deeplinkCopied: 'Link was copied',
                exitFullscreen: 'Exit Fullscreen',
                showSubtitles: 'Show Subtitles',
                hideSubtitles: 'Hide Subtitles',
            }
        };
        this.totalSeconds = 0;
        this.playedSeconds = 0;
        this.volume = 0;
        this.quality = '720';
        this.fullScreenEnabled = false;
        this.options = __assign(__assign({}, this.defaults), options);
        var _passedContainer = document.querySelector(this.options.selector);
        if (!_passedContainer) {
            throw new Error('passed selector does not point to a DOM element.');
        }
        this._container = _passedContainer;
        this.fullScreenEnabled = document.fullscreenEnabled;
        this.renderPlayer();
        this.setupEvents();
        this._video.load();
    }
    Cinematic.prototype.renderPlayer = function () {
        this._container.classList.add('video-container');
        var _video = document.createElement('video');
        _video.preload = 'metadata';
        _video.poster = this.options.poster;
        if (this.options.autoplay) {
            _video.autoplay = true;
        }
        this._container.appendChild(_video);
        this._video = _video;
        // TODO as option
        var _mp4 = document.createElement('source');
        _mp4.src = '../video/720.mp4';
        _mp4.type = 'video/mp4';
        _video.appendChild(_mp4);
        var _webM = document.createElement('source');
        _webM.src = '../video/720.webm';
        _webM.type = 'video/webm';
        _video.appendChild(_webM);
        if (this.options.subtitles) {
            var _subtitles = document.createElement('track');
            _subtitles.label = 'subtitles';
            _subtitles.kind = 'subtitles';
            _subtitles.src = this.options.subtitles;
            _subtitles.default = true;
            _video.appendChild(_subtitles);
        }
        this.tracks = _video.textTracks[0];
        this.tracks.mode = 'hidden';
        this.cues = this.tracks.cues;
        var _cuesContainer = document.createElement('div');
        _cuesContainer.classList.add('video-cues-container');
        _cuesContainer.classList.add('hidden');
        this._container.appendChild(_cuesContainer);
        var _cues = document.createElement('div');
        _cues.classList.add('video-cues');
        _cues.classList.add('hidden');
        _cuesContainer.appendChild(_cues);
        this._cues = _cues;
        this._cuesContainer = _cuesContainer;
        var _controls = document.createElement('div');
        _controls.classList.add('video-controls');
        this._container.appendChild(_controls);
        this._controls = _controls;
        var _playButton = document.createElement('i');
        _playButton.classList.add('video-control-button');
        _playButton.classList.add('material-icons');
        _playButton.textContent = 'play_arrow';
        _controls.appendChild(_playButton);
        this._playButton = _playButton;
        var _progressWrapper = document.createElement('div');
        _progressWrapper.classList.add('video-progress-wrapper');
        _controls.appendChild(_progressWrapper);
        var _bufferBar = document.createElement('progress');
        _bufferBar.classList.add('video-buffer-bar');
        _bufferBar.value = 0;
        _progressWrapper.appendChild(_bufferBar);
        this._bufferBar = _bufferBar;
        var _progressBar = document.createElement('progress');
        _progressBar.classList.add('video-progress-bar');
        _progressBar.value = 0;
        _progressWrapper.appendChild(_progressBar);
        this._progressBar = _progressBar;
        var _timer = document.createElement('span');
        _timer.classList.add('video-control-timer');
        _timer.textContent = '00:00:00 / 00:00:00';
        _controls.appendChild(_timer);
        this._timer = _timer;
        var _volumeWrapper = document.createElement('div');
        _volumeWrapper.classList.add('video-volume-wrapper');
        _controls.appendChild(_volumeWrapper);
        var _volumeSlider = document.createElement('input');
        _volumeSlider.type = 'range';
        _volumeSlider.min = '0';
        _volumeSlider.max = '1';
        _volumeSlider.step = '0.05';
        _volumeSlider.value = '0.5';
        _volumeSlider.classList.add('video-volume-slider');
        _volumeWrapper.appendChild(_volumeSlider);
        this._volumeSlider = _volumeSlider;
        var _volumeButton = document.createElement('i');
        _volumeButton.classList.add('video-control-button');
        _volumeButton.classList.add('material-icons');
        _volumeButton.textContent = 'volume_up';
        _volumeButton.title = this.options.translations.mute;
        _volumeWrapper.appendChild(_volumeButton);
        this._volumeButton = _volumeButton;
        var _qualityWrapper = document.createElement('div');
        _qualityWrapper.classList.add('video-control-dropdown');
        _controls.appendChild(_qualityWrapper);
        var _qualityButton = document.createElement('i');
        _qualityButton.classList.add('video-control-button');
        _qualityButton.classList.add('material-icons');
        _qualityButton.textContent = 'settings';
        _qualityButton.title = this.options.translations.quality;
        _qualityWrapper.appendChild(_qualityButton);
        var _dropDownContent = document.createElement('div');
        _dropDownContent.classList.add('video-dropdown-content');
        _qualityWrapper.appendChild(_dropDownContent);
        var _option1080p = document.createElement('div');
        _option1080p.classList.add('video-quality-option');
        _option1080p.dataset.quality = '1080';
        _option1080p.textContent = '1080p';
        _dropDownContent.appendChild(_option1080p);
        var _option720p = document.createElement('div');
        _option720p.classList.add('video-quality-option');
        _option720p.dataset.quality = '720';
        _option720p.textContent = '720p';
        _dropDownContent.appendChild(_option720p);
        var _option360p = document.createElement('div');
        _option360p.classList.add('video-quality-option');
        _option360p.dataset.quality = '360';
        _option360p.textContent = '360p';
        _dropDownContent.appendChild(_option360p);
        this._qualityOptions = _dropDownContent.childNodes;
        if (this.options.deeplink) {
            var _deeplinkButton = document.createElement('i');
            _deeplinkButton.classList.add('video-control-button');
            _deeplinkButton.classList.add('material-icons');
            _deeplinkButton.textContent = 'link';
            _deeplinkButton.title = this.options.translations.deeplink;
            _deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
            _controls.appendChild(_deeplinkButton);
            this._deeplinkButton = _deeplinkButton;
        }
        var _captionsButton = document.createElement('i');
        _captionsButton.classList.add('video-control-button');
        _captionsButton.classList.add('material-icons-outlined');
        _captionsButton.textContent = 'subtitles';
        _captionsButton.title = this.options.translations.showSubtitles;
        _controls.appendChild(_captionsButton);
        this._captionsButton = _captionsButton;
        if (this.fullScreenEnabled) {
            var _fullScreenButton = document.createElement('i');
            _fullScreenButton.classList.add('video-control-button');
            _fullScreenButton.classList.add('material-icons');
            _fullScreenButton.textContent = 'fullscreen';
            _fullScreenButton.title = this.options.translations.fullscreen;
            _controls.appendChild(_fullScreenButton);
            this._fullScreenButton = _fullScreenButton;
        }
    };
    ;
    Cinematic.prototype.setupEvents = function () {
        var me = this;
        this._playButton.addEventListener('click', function (e) {
            if (me._video.paused || me._video.ended) {
                me._video.play();
            }
            else {
                me._video.pause();
            }
        });
        this._volumeButton.addEventListener('click', function (e) {
            me._video.muted = !me._video.muted;
            me._volumeSlider.value = me._video.muted ? '0' : me.volume.toString();
            if (me._video.muted) {
                me._volumeButton.textContent = 'volume_off';
                me._volumeButton.title = me.options.translations.unmute;
            }
            else {
                me._volumeButton.title = me.options.translations.mute;
                if (me.volume > 0.5) {
                    me._volumeButton.textContent = 'volume_up';
                }
                else {
                    me._volumeButton.textContent = 'volume_down';
                }
            }
        });
        this._volumeSlider.addEventListener('change', function (e) {
            me._video.volume = me.volume = parseFloat(this.value);
            if (me.volume > 0.5) {
                me._volumeButton.textContent = 'volume_up';
            }
            else {
                me._volumeButton.textContent = 'volume_down';
            }
        });
        var onCueEnter = function () {
            me._cues.textContent = this.text;
            me._cues.classList.remove('hidden');
        };
        var onCueExit = function () {
            me._cues.textContent = '';
            me._cues.classList.add('hidden');
        };
        this._video.addEventListener('loadedmetadata', function () {
            me.totalSeconds = this.duration;
            me._progressBar.setAttribute('max', me.totalSeconds.toString());
            me._bufferBar.setAttribute('max', me.totalSeconds.toString());
            me.updateTimer();
            if (me.options.startTime > 0) {
                this.currentTime = me.options.startTime;
            }
            if (me.cues) {
                for (var i = 0; i < me.cues.length; i++) {
                    var cue = me.cues[i];
                    cue.onenter = onCueEnter;
                    cue.onexit = onCueExit;
                }
            }
        });
        this._video.addEventListener('timeupdate', function () {
            me.playedSeconds = this.currentTime;
            me._progressBar.value = me.playedSeconds;
            me.updateTimer();
        });
        this._video.addEventListener('play', function () {
            //me._endcard.classList.add('hidden');
            me._playButton.textContent = 'pause';
            me._playButton.title = me.options.translations.pause;
        });
        this._video.addEventListener('pause', function () {
            //me._endcard.classList.remove('hidden');
            me._playButton.textContent = 'play_arrow';
            me._playButton.title = me.options.translations.play;
        });
        this._video.addEventListener('ended', function () {
            //me._endcard.classList.remove('hidden');
            me._playButton.textContent = 'restart_alt';
            me._playButton.title = me.options.translations.restart;
        });
        this._video.addEventListener('progress', function () {
            if (this.duration > 0) {
                for (var i = 0; i < this.buffered.length; i++) {
                    var bufferRangeIndex = this.buffered.length - 1 - i;
                    var bufferStart = this.buffered.start(bufferRangeIndex);
                    var bufferEnd = this.buffered.end(bufferRangeIndex);
                    if (bufferStart <= this.currentTime) {
                        var buffered = (bufferEnd / this.duration) * 100;
                        me._bufferBar.value = buffered;
                        break;
                    }
                }
            }
        });
        this._progressBar.addEventListener('click', function (event) {
            var target = event.target;
            var rect = target.getBoundingClientRect();
            var pos = (event.clientX - rect.left) / this.offsetWidth;
            me._video.currentTime = pos * me._video.duration;
        });
        if (this.fullScreenEnabled) {
            this._fullScreenButton.addEventListener('click', function (e) {
                me.handleFullscreen();
            });
            document.addEventListener('fullscreenchange', function (e) {
                me._container.dataset.fullscreen = document.fullscreenElement;
            });
        }
        this._qualityOptions.forEach(function (_qualityOption) {
            _qualityOption.addEventListener('click', function (e) {
                var newQuality = _qualityOption.dataset.quality;
                var currentQuality = me.quality;
                if (!newQuality) {
                    return;
                }
                me._qualityOptions.forEach(function (_qualityOption) {
                    _qualityOption.classList.remove('active');
                });
                _qualityOption.classList.add('active');
                if (newQuality !== currentQuality) {
                    var currentTime = me._video.currentTime;
                    var _mp4Source = me._video.querySelector('source[type="video/mp4"]');
                    if (_mp4Source) {
                        _mp4Source.src = '../video/' + newQuality + '.mp4';
                    }
                    var _webmSource = me._video.querySelector('source[type="video/webm"]');
                    if (_webmSource) {
                        _webmSource.src = '../video/' + newQuality + '.webm';
                    }
                    me._video.load();
                    me._video.currentTime = currentTime;
                    me._video.play();
                    me.quality = newQuality;
                }
            });
        });
        this._deeplinkButton.addEventListener('click', function (event) {
            me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
        });
        this._captionsButton.addEventListener('click', function (e) {
            var wasEnabled = me._container.dataset.captions;
            me._container.dataset.captions = !wasEnabled;
            this.classList.toggle('material-icons');
            this.classList.toggle('material-icons-outlined');
            me._cuesContainer.classList.toggle('hidden');
            if (wasEnabled) {
                this.title = me.options.translations.showSubtitles;
            }
            else {
                this.title = me.options.translations.hideSubtitles;
            }
        });
    };
    Cinematic.prototype.formatTime = function (seconds) {
        return new Date(seconds * 1000).toISOString().substr(11, 8);
    };
    Cinematic.prototype.updateTimer = function () {
        this._timer.textContent = this.formatTime(this.playedSeconds) + ' / ' + this.formatTime(this.totalSeconds);
    };
    Cinematic.prototype.handleFullscreen = function () {
        if (this.isFullScreen()) {
            document.exitFullscreen();
            this._container.dataset.fullscreen = false;
            this._fullScreenButton.textContent = 'fullscreen';
            this._fullScreenButton.title = this.options.translations.fullscreen;
        }
        else {
            this._container.requestFullscreen();
            this._container.dataset.fullscreen = true;
            this._fullScreenButton.textContent = 'fullscreen_exit';
            this._fullScreenButton.title = this.options.translations.exitFullscreen;
        }
    };
    Cinematic.prototype.isFullScreen = function () {
        return document.fullscreenElement;
    };
    Cinematic.prototype.copyToClipboard = function (text, _element) {
        /*
         * inspired by clipboard.js v1.5.12
         * https://zenorocha.github.io/clipboard.js
         *
         * Licensed MIT © Zeno Rocha
         */
        var fakeElem = document.createElement('textarea');
        fakeElem.contentEditable = 'true';
        // Prevent zooming on iOS
        fakeElem.style.fontSize = '12pt';
        // Reset box model
        fakeElem.style.border = '0';
        fakeElem.style.padding = '0';
        fakeElem.style.margin = '0';
        // Move element out of screen horizontally
        fakeElem.style.position = 'absolute';
        fakeElem.style[document.documentElement.getAttribute('dir') == 'rtl' ? 'right' : 'left'] = '-9999px';
        // Move element to the same position vertically
        fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
        fakeElem.setAttribute('readonly', '');
        fakeElem.value = text;
        document.body.appendChild(fakeElem);
        fakeElem.focus();
        var range = document.createRange();
        range.selectNodeContents(fakeElem);
        var selection = window.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
        fakeElem.setSelectionRange(0, text.length);
        if (document.execCommand('copy') && typeof _element !== 'undefined') {
            _element.classList.add('copied');
            setTimeout(function () {
                _element.classList.remove('copied');
            }, 2000);
        }
        document.body.removeChild(fakeElem);
        /* Try alternative */
        var copy = function (event) {
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', text);
            }
            else if (window.clipboardData) {
                window.clipboardData.setData('Text', text);
            }
            event.preventDefault();
        };
        window.addEventListener('copy', copy);
        document.execCommand('copy');
        window.removeEventListener('copy', copy);
    };
    return Cinematic;
}());
//# sourceMappingURL=cinematic.js.map