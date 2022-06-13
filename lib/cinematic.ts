interface Document {
    webkitExitFullscreen: any;
    webkitFullscreenElement: any;
    webkitFullscreenEnabled: any;
    pictureInPictureElement: any;
    exitPictureInPicture: () => Promise<void>;
}

interface HTMLVideoElement {
    webkitEnterFullscreen: any;
    webkitSupportsFullscreen: any;
    requestPictureInPicture: () => Promise<PictureInPictureWindow>;
}

interface Options {
    selector: string;
    baseUri: string;
    autoplay: boolean;
    startTime: number;
    deeplink: string;
    deeplinkCallback?: Function
    rememberVolume: boolean;
    rememberQuality: boolean;
    quality: string;
    sources: VideoQuality[];
    video: CinematicVideo | null;
    playlist: CinematicPlaylist | null;
    closeCallback?: CloseCallback;
    translations: Translations;
}

interface VideoOptions {
    poster: string;
    titleIcon: string;
    title: string;
    description: string;
    subtitles: string;
    sources: VideoQuality[];
}

interface CloseCallback {
    (): void;
}

interface VideoQuality {
    quality: string;
    sources: VideoSource[];
}

interface VideoSource {
    type: string;
    source: string;
}

interface Translations {
    pause: string;
    play: string;
    restart: string;
    mute: string;
    unmute: string;
    settings: string;
    quality: string;
    playbackSpeed: string;
    fullscreen: string;
    deeplink: string;
    close: string;
    deeplinkCopied: string;
    exitFullscreen: string;
    showSubtitles: string;
    hideSubtitles: string;
    pictureInPicture: string;
    chromecast: string;
    showVideoInfo: string;
    hideVideoInfo: string;
}

class Cinematic {

    options: Options;

    defaults: Options = {
        selector: '',
        baseUri: '../dist',
        autoplay: false,
        startTime: 0,
        deeplink: '',
        rememberVolume: false,
        rememberQuality: false,
        quality: '720p',
        sources: [],
        video: null,
        playlist: null,
        translations: {
            pause: 'Pause',
            play: 'Play',
            restart: 'Restart',
            mute: 'Mute',
            unmute: 'Unmute',
            settings: 'Settings',
            quality: 'Quality',
            playbackSpeed: 'Speed',
            fullscreen: 'Fullscreen',
            close: 'Close',
            deeplink: 'Copy deeplink to clipboard',
            deeplinkCopied: 'Link was copied',
            exitFullscreen: 'Exit Fullscreen',
            showSubtitles: 'Show Subtitles',
            hideSubtitles: 'Hide Subtitles',
            pictureInPicture: 'Picture in picture',
            chromecast: 'Stream',
            showVideoInfo: 'Show video information',
            hideVideoInfo: 'Hide video information'
        }
    };

    _container: any;
    _video: HTMLVideoElement;
    _sources: HTMLSourceElement[] = [];
    _cues: HTMLElement;
    _cuesContainer: HTMLElement;
    _uiWrapper: HTMLDivElement;
    _videoTitleIcon: HTMLImageElement;
    _videoTitle: HTMLDivElement;
    _videoInfoButton: HTMLDivElement;
    _videoDescription: HTMLDivElement;
    _controls: HTMLElement;
    _playButton: HTMLDivElement;
    _bufferBar: HTMLProgressElement;
    _progressBar: HTMLProgressElement;
    _timer: HTMLElement;
    _volumeSlider: HTMLInputElement;
    _volumeButton: HTMLDivElement;
    _qualitySettingsSection: HTMLDivElement;
    _qualitySettingsContainer: HTMLDivElement;
    _speedSettingsContainer: HTMLDivElement;
    _captionsButton: HTMLDivElement;
    _deeplinkButton: HTMLDivElement;
    _pipButton: HTMLDivElement;
    _chromecastButton: HTMLDivElement;
    _fullScreenButton: HTMLDivElement;
    _closeButton: HTMLDivElement;
    _overlayWrapper: HTMLDivElement;
    _overlayIcon: HTMLDivElement;
    _overlayText: HTMLDivElement;

    totalSeconds = 0;
    playedSeconds = 0;
    volume = 0;
    quality = '';
    speed = 1;
    tracks: TextTrack | null;
    cues: TextTrackCueList | null;
    playlist: CinematicPlaylist;

    captionsEnabled = false;
    fullScreenEnabled = false;
    pipEnabled = false;
    userActive = false;
    userActiveCheck: number;
    userInactiveTimeout: number;
    overlayHideTimeout: number;
    doubleClickTimeout: number;

    constructor(options: Options) {
        this.options = {...this.defaults, ...options};

        const _passedContainer = document.querySelector(this.options.selector);
        if (!_passedContainer) {
            throw new Error('CinematicJS: Passed selector does not point to a DOM element.');
        }
        this._container = _passedContainer;

        this.quality = this.options.quality;
        if (this.options.rememberQuality) {
            const storedQuality = this.readFromLocalStore('quality');
            if (storedQuality) {
                this.quality = storedQuality;
            }
        }

        if ('pictureInPictureEnabled' in document) {
            this.pipEnabled = true;
        }

        if (this.options.playlist) {
            this.playlist = this.options.playlist;
        } else if (this.options.video) {
            this.playlist = new CinematicPlaylist(false, [this.options.video]);
        } else {
            throw new Error('CinematicJS: Either a single `video` or a `playlist` has to be passed as options.');
        }

        this.loadIcons();
        this.renderPlayer();
        this.updateDisplayedVideoInfo();
        this.setupEvents();

        this._video.load();

        if (this.options.rememberVolume) {
            const storedVolume = this.readFromLocalStore('volume');
            if (storedVolume) {
                this._video.volume = parseFloat(storedVolume);
            }
            const storedMuteState = this.readFromLocalStore('muted');
            if (storedMuteState) {
                this._video.muted = storedMuteState === 'true';
            }
        }

        this._container.cinematic = this as Cinematic;
    }

    loadIcons() {
        const _iconContainer = document.createElement('span');
        _iconContainer.classList.add('cinematicjs-icon-container');
        document.body.appendChild(_iconContainer);

        const request = new XMLHttpRequest();
        request.open("GET", this.options.baseUri + '/icons.svg', true);
        request.responseType = "document";
        request.onload = () => {
            const svg = request?.responseXML?.documentElement;
            // Don't render anything that is not an SVG, e.g. an HTML error page
            if (svg && svg.nodeName === 'svg') {
                _iconContainer.appendChild(svg);
            }
        }
        request.send();
    }

    renderPlayer() {
        this._container.classList.add('cinematicjs-video-container');

        let initialVideo = this.playlist.getCurrentVideo();

        this._video = document.createElement('video');
        this._video.preload = 'metadata';
        this._video.tabIndex = -1;
        this._video.playsInline = true;
        // Suppress the unwanted right click context menu of the video element itself
        this._video.oncontextmenu = () => false;
        if (this.options.autoplay) {
            this._video.autoplay = true;
        }
        this._container.appendChild(this._video);

        this.fullScreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || this._video.webkitSupportsFullscreen;

        let startSource = initialVideo.getSourcesForQuality(this.quality);

        if (!startSource) {
            throw new Error('CinematicJS: Passed quality does not match any of the passed sources.');
        }

        startSource.sources.forEach(source => {
            const _source = document.createElement('source');
            _source.src = source.source;
            _source.type = source.type;
            this._video.appendChild(_source);
            this._sources.push(_source);
        });

        this._overlayWrapper = document.createElement('div');
        this._overlayWrapper.classList.add('cinematicjs-video-overlay-wrapper');
        this._overlayWrapper.classList.add('cinematicjs-hidden');
        this._container.appendChild(this._overlayWrapper);

        const _overlayContainer = document.createElement('div');
        _overlayContainer.classList.add('cinematicjs-video-overlay-container');
        this._overlayWrapper.appendChild(_overlayContainer);

        this._overlayIcon = document.createElement('div');
        this._overlayIcon.classList.add('cinematicjs-video-overlay-icon');
        Cinematic.renderButtonIcon(this._overlayIcon, 'mute');
        _overlayContainer.appendChild(this._overlayIcon);

        this._overlayText = document.createElement('div');
        this._overlayText.classList.add('cinematicjs-video-overlay-text');
        _overlayContainer.appendChild(this._overlayText);

        this._uiWrapper = document.createElement('div');
        this._uiWrapper.classList.add('cinematicjs-ui-wrapper');
        this._container.appendChild(this._uiWrapper);

        const _header = document.createElement('div');
        _header.classList.add('cinematicjs-video-header');
        this._uiWrapper.appendChild(_header);

        this._videoTitleIcon = document.createElement('img');
        this._videoTitleIcon.classList.add('cinematicjs-video-icon');
        _header.appendChild(this._videoTitleIcon);

        this._videoTitle = document.createElement('div');
        this._videoTitle.classList.add('cinematicjs-video-title');
        this._videoTitle.addEventListener('click', () => this.handleVideoInfoToggle());
        _header.appendChild(this._videoTitle);

        this._videoInfoButton = document.createElement('div');
        this._videoInfoButton.classList.add('cinematicjs-video-info-button');
        this._videoInfoButton.addEventListener('click', () => this.handleVideoInfoToggle());
        this._videoInfoButton.title = this.options.translations.showVideoInfo;
        Cinematic.renderButtonIcon(this._videoInfoButton, 'info');
        _header.appendChild(this._videoInfoButton);

        const _headerSpacer = document.createElement('div');
        _headerSpacer.classList.add('cinematicjs-video-header-spacer');
        _header.appendChild(_headerSpacer);

        this._chromecastButton = document.createElement('div');
        this._chromecastButton.classList.add('cinematicjs-video-control-button');
        this._chromecastButton.classList.add('cinematicjs-hidden');
        this._chromecastButton.title = this.options.translations.chromecast;
        this._chromecastButton.addEventListener('click', () => this._video.remote.prompt());
        Cinematic.renderButtonIcon(this._chromecastButton, 'chromecast');
        _header.appendChild(this._chromecastButton);

        if (this._video.remote) {
            this._video.remote.watchAvailability((available) => {
                this._chromecastButton.classList.toggle('cinematicjs-hidden', !available);
            }).catch(() => {
                this._chromecastButton.classList.add('cinematicjs-hidden');
            });
        }

        if (this.options.closeCallback) {
            this._closeButton = document.createElement('div');
            this._closeButton.classList.add('cinematicjs-video-close-button');
            this._closeButton.title = this.options.translations.close;
            Cinematic.renderButtonIcon(this._closeButton, 'close');
            _header.appendChild(this._closeButton);
        }

        this._videoDescription = document.createElement('div');
        this._videoDescription.classList.add('cinematicjs-video-description');
        this._videoDescription.classList.add('cinematicjs-hidden');
        this._uiWrapper.appendChild(this._videoDescription);

        const _footer = document.createElement('div');
        _footer.classList.add('cinematicjs-video-footer');
        this._uiWrapper.appendChild(_footer);

        const _progressWrapper = document.createElement('div');
        _progressWrapper.classList.add('cinematicjs-video-progress-wrapper');
        _footer.appendChild(_progressWrapper);

        this._bufferBar = document.createElement('progress');
        this._bufferBar.classList.add('cinematicjs-video-buffer-bar');
        this._bufferBar.value = 0;
        _progressWrapper.appendChild(this._bufferBar);

        this._progressBar = document.createElement('progress');
        this._progressBar.classList.add('cinematicjs-video-progress-bar');
        this._progressBar.value = 0;
        _progressWrapper.appendChild(this._progressBar);

        this._controls = document.createElement('div');
        this._controls.classList.add('cinematicjs-video-controls');
        _footer.appendChild(this._controls);

        this._playButton = document.createElement('div');
        this._playButton.classList.add('cinematicjs-video-control-button');
        Cinematic.renderButtonIcon(this._playButton, 'play');
        this._controls.appendChild(this._playButton);

        this._timer = document.createElement('span');
        this._timer.classList.add('cinematicjs-video-control-timer');
        this._timer.textContent = '00:00:00 / 00:00:00';
        this._controls.appendChild(this._timer);

        const _spacer = document.createElement('div');
        _spacer.classList.add('video-control-spacer');
        this._controls.appendChild(_spacer);

        const _volumeWrapper = document.createElement('div');
        _volumeWrapper.classList.add('cinematicjs-video-volume-wrapper');
        this._controls.appendChild(_volumeWrapper);

        this._volumeSlider = document.createElement('input');
        this._volumeSlider.type = 'range';
        this._volumeSlider.min = '0';
        this._volumeSlider.max = '1';
        this._volumeSlider.step = '0.05';
        this._volumeSlider.value = '1';
        this._volumeSlider.classList.add('cinematicjs-video-volume-slider');
        _volumeWrapper.appendChild(this._volumeSlider);

        this._volumeButton = document.createElement('div');
        this._volumeButton.classList.add('cinematicjs-video-control-button');
        this._volumeButton.title = this.options.translations.mute;
        Cinematic.renderButtonIcon(this._volumeButton, 'sound');
        _volumeWrapper.appendChild(this._volumeButton);

        const _settingsWrapper = document.createElement('div');
        _settingsWrapper.classList.add('cinematicjs-video-control-dropdown');
        this._controls.appendChild(_settingsWrapper);

        const _settingsButton = document.createElement('div');
        _settingsButton.classList.add('cinematicjs-video-control-button');
        _settingsButton.title = this.options.translations.settings;
        Cinematic.renderButtonIcon(_settingsButton, 'settings');
        _settingsWrapper.appendChild(_settingsButton);

        const _dropDownContent = document.createElement('div');
        _dropDownContent.classList.add('cinematicjs-video-dropdown-content');
        _settingsWrapper.appendChild(_dropDownContent);

        this._qualitySettingsSection = document.createElement('div');
        this._qualitySettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(this._qualitySettingsSection);

        const _qualitySettingsHeading = document.createElement('h1');
        _qualitySettingsHeading.textContent = this.options.translations.quality;
        this._qualitySettingsSection.appendChild(_qualitySettingsHeading);

        this._qualitySettingsContainer = document.createElement('div');
        this._qualitySettingsSection.appendChild(this._qualitySettingsContainer);

        this.renderQualityOptions();

        const _speedSettingsSection = document.createElement('div');
        _speedSettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(_speedSettingsSection);

        const _speedSettingsHeading = document.createElement('h1');
        _speedSettingsHeading.textContent = this.options.translations.playbackSpeed;
        _speedSettingsSection.appendChild(_speedSettingsHeading);

        this._speedSettingsContainer = document.createElement('div');
        _speedSettingsSection.appendChild(this._speedSettingsContainer);

        this.renderPlaybackSpeedOptions();

        if (this.options.deeplink) {
            this._deeplinkButton = document.createElement('div');
            this._deeplinkButton.classList.add('cinematicjs-video-control-button');
            this._deeplinkButton.title = this.options.translations.deeplink;
            this._deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
            Cinematic.renderButtonIcon(this._deeplinkButton, 'deeplink');
            this._controls.appendChild(this._deeplinkButton);
        }

        this._cuesContainer = document.createElement('div');
        this._cuesContainer.classList.add('cinematicjs-video-cues-container');
        this._cuesContainer.classList.add('cinematicjs-hidden');
        this._container.appendChild(this._cuesContainer);

        this._cues = document.createElement('div');
        this._cues.classList.add('video-cues');
        this._cues.classList.add('cinematicjs-hidden');
        this._cuesContainer.appendChild(this._cues);

        this._captionsButton = document.createElement('div');
        this._captionsButton.classList.add('cinematicjs-video-control-button');
        this._captionsButton.title = this.options.translations.showSubtitles;
        Cinematic.renderButtonIcon(this._captionsButton, 'expanded-cc');
        this._controls.appendChild(this._captionsButton);

        this.prepareSubtitles();

        if (this.pipEnabled) {
            this._pipButton = document.createElement('div');
            this._pipButton.classList.add('cinematicjs-video-control-button');
            this._pipButton.title = this.options.translations.pictureInPicture;
            Cinematic.renderButtonIcon(this._pipButton, 'inpicture');
            this._controls.appendChild(this._pipButton);
        }

        if (this.fullScreenEnabled) {
            this._fullScreenButton = document.createElement('div');
            this._fullScreenButton.classList.add('cinematicjs-video-control-button');
            this._fullScreenButton.title = this.options.translations.fullscreen;
            Cinematic.renderButtonIcon(this._fullScreenButton, 'fullscreen');
            this._controls.appendChild(this._fullScreenButton);
        }
    }

    private renderQualityOptions() {
        this._qualitySettingsContainer.textContent = '';

        if (this.playlist.getCurrentVideo().sources.length > 1) {
            this.playlist.getCurrentVideo().sources.forEach(source => {
                const _option = document.createElement('div');
                _option.classList.add('video-quality-option');
                _option.classList.add('cinematicjs-video-dropdown-option');
                if (this.quality === source.quality) {
                    _option.classList.add('active');
                }
                _option.textContent = source.quality;
                _option.dataset.quality = source.quality;

                _option.addEventListener('click', () => this.handleQualityChange(_option.dataset.quality ?? ''));

                this._qualitySettingsContainer.appendChild(_option);
            });

            this._qualitySettingsSection.classList.remove('cinematicjs-hidden');
        } else {
            this._qualitySettingsSection.classList.add('cinematicjs-hidden');
        }
    }

    private renderPlaybackSpeedOptions() {
        this._speedSettingsContainer.textContent = '';

        [0.5, 1.0, 1.25, 1.5, 1.75, 2.0].forEach(speedSetting => {
            const _option = document.createElement('div');
            _option.classList.add('video-speed-option');
            _option.classList.add('cinematicjs-video-dropdown-option');
            if (this.speed === speedSetting) {
                _option.classList.add('active');
            }
            _option.textContent = speedSetting + 'x';
            _option.dataset.speed = speedSetting + '';

            _option.addEventListener('click', () => this.handleSpeedChange(speedSetting));

            this._speedSettingsContainer.appendChild(_option);
        });
    }

    private handleQualityChange(newQuality: string) {
        if (!newQuality) {
            return;
        }

        let currentVideo = this.playlist.getCurrentVideo();
        let newSource = currentVideo.getSourcesForQuality(newQuality);
        if (!newSource) {
            newQuality = currentVideo.getBestAvailableQuality();
            newSource = currentVideo.getSourcesForQuality(newQuality);
        }
        if (!newSource) {
            return;
        }

        if (this.options.rememberQuality) {
            this.writeToLocalStore('quality', newQuality);
        }

        this._qualitySettingsContainer.childNodes.forEach(function (_option: HTMLElement) {
            if (_option.dataset.quality === newQuality) {
                _option.classList.add('active');
            } else {
                _option.classList.remove('active');
            }
        });

        const currentTime = this._video.currentTime;
        const wasPlaying = !this._video.paused;

        newSource.sources.forEach((videoFormatSource, index) => {
            const _source = this._sources[index];
            if (_source) {
                _source.src = videoFormatSource.source;
            }
        });

        this._video.load();
        this._video.currentTime = currentTime;
        if (wasPlaying) {
            this._video.play();
        }
        this.quality = newQuality;
    }

    private handleSpeedChange(newSpeed: number) {
        if (!newSpeed) {
            return;
        }
        this.speed = newSpeed;
        this._video.playbackRate = newSpeed;

        this._speedSettingsContainer.childNodes.forEach(function (_option: HTMLElement) {
            if (_option.dataset.speed === newSpeed.toString()) {
                _option.classList.add('active');
            } else {
                _option.classList.remove('active');
            }
        });
    }

    private handleVideoInfoToggle() {
        this._videoDescription.classList.toggle('cinematicjs-hidden');
        if (this._videoDescription.classList.contains('cinematicjs-hidden')) {
            this._videoInfoButton.title = this.options.translations.showVideoInfo;
        } else {
            this._videoInfoButton.title = this.options.translations.hideVideoInfo;
        }
    }

    private prepareSubtitles() {
        let _oldTrack = this._video.querySelector('track');
        if (_oldTrack) {
            this._video.removeChild(_oldTrack);
            this._captionsButton.classList.add('cinematicjs-hidden');
        }

        let video = this.playlist.getCurrentVideo();
        if (!video.subtitles) {
            this._cues.classList.add('cinematicjs-hidden');
            this._captionsButton.classList.add('cinematicjs-hidden');
            this.tracks = null;
            this.cues = null;
            return;
        }

        const _subtitles = document.createElement('track');
        _subtitles.label = 'subtitles';
        _subtitles.kind = 'subtitles';
        _subtitles.src = video.subtitles;
        _subtitles.default = true;
        this._video.appendChild(_subtitles);

        const me = this;
        if (_subtitles.readyState === 2) {
            me.handleLoadedTrack();
        } else {
            _subtitles.addEventListener('load', () => me.handleLoadedTrack());
        }

        this._captionsButton.classList.remove('cinematicjs-hidden');
    }

    private handleLoadedTrack() {
        this.tracks = this._video.textTracks[0];
        this.tracks.mode = 'hidden';
        this.cues = this.tracks.cues;

        const me = this;
        const onCueEnter = function (this: any) {
            me._cues.textContent = this.text;
            me._cues.classList.remove('cinematicjs-hidden');
        };

        const onCueExit = function () {
            me._cues.textContent = '';
            me._cues.classList.add('cinematicjs-hidden');
        };

        if (this.cues) {
            for (let i = 0; i < this.cues.length; i++) {
                let cue = this.cues[i];
                cue.onenter = onCueEnter;
                cue.onexit = onCueExit;
            }
        }
    }

    setupEvents() {
        const me = this;

        window.addEventListener('resize', () => this.handlePlayerResize());
        this.handlePlayerResize();

        if (ResizeObserver) {
            new ResizeObserver(() => this.handlePlayerResize()).observe(this._container);
        }

        this._playButton.addEventListener('click', () => {
            if (this._video.ended) {
                this.playlist.resetToBeginning();
                this.handleVideoChange();
            } else if (this._video.paused) {
                this._video.play();
            } else {
                this._video.pause();
            }
        });

        this._volumeButton.addEventListener('click', () => {
            this._video.muted = !this._video.muted;
        });

        this._volumeSlider.addEventListener('change', () => {
            // To allow the user to change from mute to a specific volume via the slider.
            this._video.muted = false;
            this._video.volume = this.volume = parseFloat(this._volumeSlider.value);
        });

        this._video.addEventListener('loadedmetadata', function () {
            me.totalSeconds = this.duration;
            me._progressBar.setAttribute('max', me.totalSeconds.toString());
            me._bufferBar.setAttribute('max', me.totalSeconds.toString());
            me.updateTimer();

            if (me.options.startTime > 0) {
                this.currentTime = me.options.startTime;
            }
        });

        this._video.addEventListener('timeupdate', function () {
            me.playedSeconds = this.currentTime;
            me._progressBar.value = me.playedSeconds;

            me.updateTimer();
        });

        this._video.addEventListener('volumechange', () => {
            if (this.options.rememberVolume) {
                this.writeToLocalStore('volume', this._video.volume.toString());
                this.writeToLocalStore('muted', String(this._video.muted));
            }

            if (this._video.muted) {
                // Set the volume slider to its min value to indicate the mute.
                this._volumeSlider.value = '0';
                Cinematic.switchButtonIcon(this._volumeButton, 'mute');
                this._volumeButton.title = this.options.translations.unmute;
            } else {
                this._volumeSlider.value = this._video.volume.toString();
                this._volumeButton.title = this.options.translations.mute;
                if (this.volume > 0.5) {
                    Cinematic.switchButtonIcon(this._volumeButton, 'sound');
                } else {
                    Cinematic.switchButtonIcon(this._volumeButton, 'low');
                }
            }
        });

        this._video.addEventListener('play', () => {
            Cinematic.switchButtonIcon(me._playButton, 'pause');
            me._playButton.title = me.options.translations.pause;
            me._video.focus();

            // Shows the timer even when video container is invisible during initialization of the player
            this.handlePlayerResize();
        });

        this._video.addEventListener('pause', function () {
            Cinematic.switchButtonIcon(me._playButton, 'play');
            me._playButton.title = me.options.translations.play;
        });

        this._video.addEventListener('ended', () => {
            if (this.playlist.shouldPlayNextVideo()) {
                this.playlist.startNextVideo();
                this.handleVideoChange();
            } else {
                Cinematic.switchButtonIcon(this._playButton, 'repeat');
                this._playButton.title = me.options.translations.restart;
                this.showControls();
            }
        });

        this._video.addEventListener('progress', function () {
            if (this.duration > 0) {
                for (let i = 0; i < this.buffered.length; i++) {
                    const bufferRangeIndex = this.buffered.length - 1 - i;
                    const bufferStart = this.buffered.start(bufferRangeIndex);
                    const bufferEnd = this.buffered.end(bufferRangeIndex);
                    if (bufferStart <= this.currentTime) {
                        me._bufferBar.value = (bufferEnd / this.duration) * 100;
                        break;
                    }
                }
            }
        });

        this._video.addEventListener('click', () => {
            window.setTimeout(() => {
                if (me._video.paused || me._video.ended) {
                    me._video.play();
                    this.showOverlay('play', null, true);
                } else {
                    me._video.pause();
                    this.showOverlay('pause', null, true);
                }
                this.userActive = true;
            }, 300);
        });

        this._video.addEventListener('dblclick', (event) => {
            if (this.doubleClickTimeout) {
                clearTimeout(this.doubleClickTimeout);
            }

            // Get the bounding rectangle of target
            const rect = this._video.getBoundingClientRect();
            const thirds = rect.width / 3;

            // Mouse position
            const x = event.clientX - rect.left;

            if (x <= thirds) {
                this._video.currentTime -= 10;
                this.showOverlay('backwards', '- 10s', true);
            } else if (x <= thirds * 2) {
                this.toggleFullScreen();
            } else {
                this._video.currentTime += 10;
                this.showOverlay('fastforward', '+ 10s', true);
            }
            this.userActive = true;
        });

        this._container.addEventListener('mousemove', () => this.userActive = true);

        this.userActiveCheck = window.setInterval(() => {
            if (!this.userActive) {
                return;
            }

            this.userActive = false;

            this.showControls();

            clearTimeout(this.userInactiveTimeout);

            this.userInactiveTimeout = window.setTimeout(() => {
                if (!this.userActive) {
                    this.hideControls();

                    const _activeElement = document.activeElement;
                    if (_activeElement && _activeElement.parentElement == this._controls) {
                        // We put focus on the video element so hotkeys work again after a control bar button is pressed
                        // and the user is inactive again.
                        this._video.focus();
                    }
                }
            }, 2000);


        }, 250);

        this._progressBar.addEventListener('click', function (event) {
            const target = event.target as HTMLElement;
            const rect = target.getBoundingClientRect();
            const pos = (event.clientX - rect.left) / this.offsetWidth;
            me._video.currentTime = pos * me._video.duration;
        });

        if (this.fullScreenEnabled) {
            this._fullScreenButton.addEventListener('click', () => me.toggleFullScreen());

            document.addEventListener('fullscreenchange', () => this.handleFullScreenChange());
            document.addEventListener('webkitfullscreenchange', () => this.handleFullScreenChange());
        }

        if (this.options.deeplink) {
            this._deeplinkButton.addEventListener('click', () => {
                if (!this.options.deeplinkCallback || this.options.deeplinkCallback.call(this)) {
                    me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
                }
            });
        }

        this._captionsButton.addEventListener('click', function () {
            me._cuesContainer.classList.toggle('cinematicjs-hidden');
            if (me.captionsEnabled) {
                me._captionsButton.title = me.options.translations.showSubtitles;
                Cinematic.switchButtonIcon(me._captionsButton, 'expanded-cc');
            } else {
                me._captionsButton.title = me.options.translations.hideSubtitles;
                Cinematic.switchButtonIcon(me._captionsButton, 'cc');
            }
            me.captionsEnabled = !me.captionsEnabled;
        });

        if (this.pipEnabled) {
            this._pipButton.addEventListener('click', async () => {
                try {
                    if (this._video !== document.pictureInPictureElement) {
                        await this._video.requestPictureInPicture();
                    } else {
                        await document.exitPictureInPicture();
                    }
                } catch (error) {
                    console.error(error)
                }
            });
        }

        if (this.options.closeCallback) {
            this._closeButton.addEventListener('click', () => {
                this.options.closeCallback?.apply(this);
            });
        }

        this._video.addEventListener('keydown', event => {
            const {key} = event;

            event.preventDefault();
            event.stopPropagation();

            switch (key) {
                // Space bar allows to pause/resume the video
                case ' ':
                case 'Spacebar':
                    this.userActive = true;
                    if (this._video.paused) {
                        this._video.play();
                        this.showOverlay('play', null, true);
                    } else {
                        this._video.pause();
                        this.showOverlay('pause', null, true);
                    }
                    break;
                // Escape leaves the fullscreen when currently enabled
                case 'Escape':
                    this.userActive = true;
                    if (this.fullScreenEnabled && this.isFullScreen()) {
                        this.toggleFullScreen();
                    }
                    break;
                // Left Arrow skips 10 seconds into the past
                case 'ArrowLeft':
                case 'Left':
                    this.userActive = true;
                    this._video.currentTime -= 10;
                    this.showOverlay('backwards', '- 10s', true);
                    break;
                // Right Arrow skips 10 seconds into the future
                case 'ArrowRight':
                case 'Right':
                    this.userActive = true;
                    this._video.currentTime += 10;
                    this.showOverlay('fastforward', '+ 10s', true);
                    break;
                // Down Arrow decreases the volume by 5%
                case 'ArrowDown':
                case 'Down':
                    this.userActive = true;
                    if (this._video.volume > 0) {
                        let currentVolume = Math.round((this._video.volume + Cinematic.getEpsilon()) * 100);
                        this.volume = (currentVolume - 5) / 100;
                        this._video.volume = this.volume;
                        if (this.volume === 0) {
                            // Also switch on mute when we reach 0% volume
                            this._video.muted = true;
                            this.showOverlay('mute', '0 %', true);
                        } else {
                            this.showOverlay('low', Math.round(this.volume * 100) + ' %', true);
                        }
                        this._volumeSlider.value = this.volume.toString();
                    }
                    break;
                // Up Arrow increases the volume by 5%
                case 'ArrowUp':
                case 'Up':
                    this.userActive = true;
                    if (this._video.volume < 1) {
                        let currentVolume = Math.round((this._video.volume + Cinematic.getEpsilon()) * 100);
                        this.volume = (currentVolume + 5) / 100;
                        this._video.volume = this.volume;
                        // Unmute if we previously were muted
                        this._video.muted = false;
                        this.showOverlay('sound', Math.round(this.volume * 100) + ' %', true);
                        this._volumeSlider.value = this.volume.toString();
                    }
                    break;
            }
        });

        return true;
    }

    private handleVideoChange() {
        this.prepareSubtitles();
        this.renderQualityOptions();
        this.handleQualityChange(this.quality);
        this.updateDisplayedVideoInfo();

        this._video.currentTime = 0;
        this._video.play();
    }

    private updateDisplayedVideoInfo() {
        const currentVideo = this.playlist.getCurrentVideo();
        this._video.poster = currentVideo.poster || '';
        this._videoTitleIcon.src = currentVideo.titleIcon || '';
        this._videoTitleIcon.classList.toggle('cinematicjs-hidden', this._videoTitleIcon.src.length === 0);
        this._videoTitle.textContent = currentVideo.title || '';
        this._videoTitle.classList.toggle('cinematicjs-clickable', !!currentVideo.description);
        this._videoInfoButton.classList.toggle('cinematicjs-hidden', !currentVideo.description);
        this._videoDescription.textContent = currentVideo.description || '';
    }

    private handlePlayerResize() {
        if (this._container.clientWidth >= 328) {
            this._timer.classList.remove('cinematicjs-hidden');
        } else {
            this._timer.classList.add('cinematicjs-hidden');
        }
    }

    private static renderButtonIcon(_button: HTMLDivElement, icon: string) {
        const _icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        _icon.setAttribute('viewBox', '0 0 24 24');
        const _use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        _use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-' + icon);
        _icon.appendChild(_use);
        _button.appendChild(_icon);
    }

    private static switchButtonIcon(_button: HTMLDivElement, newIcon: string) {
        _button.querySelector('svg use')?.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-' + newIcon);
    }

    private showOverlay(icon: string, text: string | null, hideAutomatically: boolean) {
        Cinematic.switchButtonIcon(this._overlayIcon, icon);
        this._overlayText.textContent = text;
        this._overlayWrapper.classList.remove('cinematicjs-hidden');

        clearTimeout(this.overlayHideTimeout);

        if (hideAutomatically) {
            this.overlayHideTimeout = window.setTimeout(() => {
                this._overlayWrapper.classList.add('cinematicjs-hidden');
            }, 500);
        }
    }

    formatTime(seconds: number) {
        let hourComponent = Math.floor(seconds / 3600);
        let minuteComponent = Math.floor(seconds / 60 % 60);
        let secondComponent = Math.floor(seconds % 60);

        let timer = this.toTimerComponent(minuteComponent) + ':' + this.toTimerComponent(secondComponent);

        if (this.totalSeconds >= (60 * 60)) {
            // Include the hours in both timers when the video is at least an hour long
            return this.toTimerComponent(hourComponent) + ':' + timer;
        }

        return timer;
    }

    toTimerComponent(value: number) {
        return value < 10 ? '0' + value : value;
    }

    updateTimer() {
        this._timer.textContent = this.formatTime(this.playedSeconds) + ' / ' + this.formatTime(this.totalSeconds);
    }

    writeToLocalStore(name: string, value: string) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem('cinematic-js-' + name, value);
            }
        } catch (e) {
            console.log('CinematicJS: Cannot write to local store', {name: name, value: value, error: e});
        }
    }

    readFromLocalStore(name: string): string | null {
        try {
            if (window.localStorage) {
                return window.localStorage.getItem('cinematic-js-' + name);
            }
        } catch (e) {
            console.log('CinematicJS: Cannot read from local store', {name: name, error: e});
        }
        return null;
    }

    toggleFullScreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (document.webkitFullscreenElement) {
            // Need this to support Safari
            document.webkitExitFullscreen();
        } else if (this._container.webkitRequestFullscreen) {
            // Need this to support Safari
            this._container.webkitRequestFullscreen();
        } else if (this._video.webkitEnterFullscreen) {
            // Need this to support iOS Safari
            this._video.webkitEnterFullscreen();
        } else {
            this._container.requestFullscreen();
        }
    }

    handleFullScreenChange() {
        if (this.isFullScreen()) {
            this._container.dataset.fullscreen = true;
            Cinematic.switchButtonIcon(this._fullScreenButton, 'closefullscreen');
            this._fullScreenButton.title = this.options.translations.exitFullscreen;
        } else {
            this._container.dataset.fullscreen = false;
            Cinematic.switchButtonIcon(this._fullScreenButton, 'fullscreen');
            this._fullScreenButton.title = this.options.translations.fullscreen;
        }
    }

    showControls() {
        this._container.classList.remove('cinematicjs-video-user-inactive');
        this._uiWrapper.classList.remove('cinematicjs-hidden');
    }

    hideControls() {
        if (this._video.paused) {
            return;
        }

        this._container.classList.add('cinematicjs-video-user-inactive');
        this._uiWrapper.classList.add('cinematicjs-hidden');
    }

    isFullScreen() {
        return document.fullscreenElement || document.webkitFullscreenElement;
    }

    copyToClipboard(text: string, _element: HTMLElement) {
        /*
         * inspired by clipboard.js v1.5.12
         * https://zenorocha.github.io/clipboard.js
         *
         * Licensed MIT © Zeno Rocha
         */
        const fakeElem = document.createElement('textarea');
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

        const range = document.createRange();
        range.selectNodeContents(fakeElem);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        fakeElem.setSelectionRange(0, text.length);

        if (document.execCommand('copy') && typeof _element !== 'undefined') {
            _element.classList.add('cinematicjs-copied');
            setTimeout(function () {
                _element.classList.remove('cinematicjs-copied');
            }, 2000);
        }
        document.body.removeChild(fakeElem);

        /* Try alternative */
        const copy = function (event: ClipboardEvent) {
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', text);
            } else if ((<any>window).clipboardData) {
                (<any>window).clipboardData.setData('Text', text);
            }
            event.preventDefault();
        }

        window.addEventListener('copy', copy);
        document.execCommand('copy');
        window.removeEventListener('copy', copy);
    }

    private static getEpsilon(): number {
        if (Number.EPSILON) {
            return Number.EPSILON;
        }
        let epsilon = 1.0;
        while ((1.0 + 0.5 * epsilon) !== 1.0) {
            epsilon *= 0.5;
        }
        return epsilon;
    }
}

class CinematicVideo {
    poster: string;
    titleIcon: string;
    title: string;
    description: string;
    subtitles: string | null;
    sources: VideoQuality[];

    constructor(options: VideoOptions) {
        this.poster = options.poster;
        this.titleIcon = options.titleIcon;
        this.title = options.title;
        this.description = options.description;
        this.subtitles = options.subtitles;
        this.sources = options.sources;
    }

    getSourcesForQuality(quality: string): VideoQuality | null {
        if (this.sources.length === 1) {
            return this.sources[0];
        }
        for (let source of this.sources) {
            if (source.quality === quality) {
                return source;
            }
        }
        return null;
    }

    getBestAvailableQuality(): string {
        return this.sources[0].quality;
    }
}

class CinematicPlaylist {
    loop: boolean;
    videos: CinematicVideo[];
    currentVideo: number;

    constructor(loop: boolean, videos: CinematicVideo[]) {
        this.loop = loop;
        this.videos = videos;
        this.currentVideo = 0;

        if (this.videos.length === 0) {
            throw new Error('CinematicJS: At least one video has to be passed.');
        }
    }

    getCurrentVideo(): CinematicVideo {
        return this.videos[this.currentVideo];
    }

    shouldPlayNextVideo(): boolean {
        return this.videos.length > 1 && (this.currentVideo + 1 < this.videos.length || this.loop);
    }

    startNextVideo() {
        this.currentVideo++;
        if (this.loop && this.currentVideo >= this.videos.length) {
            this.resetToBeginning();
        }
    }

    resetToBeginning() {
        this.currentVideo = 0;
    }
}
