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
    _sources: Map<string, HTMLSourceElement> = new Map<string, HTMLSourceElement>();
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
    _settingsWrapper: HTMLDivElement;
    _settingsButton: HTMLDivElement;
    _qualitySelect: HTMLSelectElement;
    _qualitySettingsSection: HTMLDivElement;
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
    _isChangingQuality = false;
    _playButtonKeyboardActivated = false;
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

        if (this.options.playlist) {
            this.playlist = this.options.playlist;
        } else if (this.options.video) {
            this.playlist = new CinematicPlaylist(false, [this.options.video]);
        } else {
            throw new Error('CinematicJS: Either a single `video` or a `playlist` has to be passed as options.');
        }

        this.filterPlayableSources();

        this.quality = this.options.quality;
        if (this.options.rememberQuality) {
            const storedQuality = this.readFromLocalStore('quality');
            if (storedQuality) {
                this.quality = this.handleVideoQualityFallback(storedQuality);
            }
        }

        if ('pictureInPictureEnabled' in document) {
            this.pipEnabled = true;
        }

        this.loadIcons();
        this.renderPlayer();
        this.updateDisplayedVideoInfo();
        this.setupEvents();

        this._video.load();

        if (this.options.rememberVolume) {
            const storedVolume = this.readFromLocalStore('volume');
            if (storedVolume) {
                this._video.volume = Number.parseFloat(storedVolume);
            }
            const storedMuteState = this.readFromLocalStore('muted');
            if (storedMuteState) {
                this._video.muted = storedMuteState === 'true';
            }
        }

        this._container.cinematic = this as Cinematic;
    }

    filterPlayableSources() {
        const _video = document.createElement('video');
        for (const video of this.playlist.videos) {
            // Only keep qualities with at least one playable source
            video.sources = video.sources.filter(source => {
                // Only keep sources that may be playable by the browser
                source.sources = source.sources.filter(source => {
                    return _video.canPlayType(source.type) !== '';
                });
                return source.sources.length > 0;
            });
        }
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
            if (svg?.nodeName === 'svg') {
                _iconContainer.appendChild(svg);
            }
        }
        request.send();
    }

    renderPlayer() {
        this._container.classList.add('cinematicjs-video-container');
        this._container.role = 'region';
        this._container.ariaLabel = 'Video player';

        let initialVideo = this.playlist.getCurrentVideo();

        this._video = document.createElement('video');
        this._video.preload = 'metadata';
        this._video.tabIndex = 0;
        this._video.playsInline = true;
        this._video.ariaLabel = 'Video player';
        // Suppress the unwanted right-click context menu of the video element itself
        this._video.oncontextmenu = () => false;
        if (this.options.autoplay) {
            this._video.autoplay = true;
        }
        this._container.appendChild(this._video);

        let startSource = initialVideo.getSourcesForQuality(this.quality);

        if (!startSource) {
            throw new Error('CinematicJS: Passed quality does not match any of the passed sources.');
        }

        this.updateVideoSourceElements(startSource.sources);

        this._overlayWrapper = document.createElement('div');
        this._overlayWrapper.classList.add('cinematicjs-video-overlay-wrapper', 'cinematicjs-hidden');
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
        this._videoInfoButton.role = 'button';
        this._videoInfoButton.tabIndex = 0;
        this._videoInfoButton.ariaLabel = this.options.translations.showVideoInfo;
        this._videoInfoButton.ariaExpanded = 'false';
        this._videoInfoButton.title = this.options.translations.showVideoInfo;
        Cinematic.renderButtonIcon(this._videoInfoButton, 'info');
        _header.appendChild(this._videoInfoButton);

        const _headerSpacer = document.createElement('div');
        _headerSpacer.classList.add('cinematicjs-video-header-spacer');
        _header.appendChild(_headerSpacer);

        this._chromecastButton = document.createElement('div');
        this._chromecastButton.classList.add('cinematicjs-video-control-button', 'cinematicjs-hidden');
        this._chromecastButton.role = 'button';
        this._chromecastButton.tabIndex = 0;
        this._chromecastButton.ariaLabel = this.options.translations.showVideoInfo;
        this._chromecastButton.title = this.options.translations.chromecast;
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
            this._closeButton.role = 'button';
            this._closeButton.tabIndex = 0;
            this._closeButton.ariaLabel = this.options.translations.close;
            this._closeButton.title = this.options.translations.close;
            Cinematic.renderButtonIcon(this._closeButton, 'close');
            _header.appendChild(this._closeButton);
        }

        this._videoDescription = document.createElement('div');
        this._videoDescription.classList.add('cinematicjs-video-description', 'cinematicjs-hidden');
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
        this._progressBar.role = 'slider';
        this._progressBar.tabIndex = 0;
        this._progressBar.ariaLabel = 'Video progress';
        this._progressBar.ariaValueMin = '0';
        this._progressBar.ariaValueMax = '100';
        this._progressBar.ariaValueNow = '0';
        this._progressBar.value = 0;
        _progressWrapper.appendChild(this._progressBar);

        this._controls = document.createElement('div');
        this._controls.classList.add('cinematicjs-video-controls');
        _footer.appendChild(this._controls);

        this._playButton = document.createElement('div');
        this._playButton.classList.add('cinematicjs-video-control-button');
        this._playButton.role = 'button';
        this._playButton.tabIndex = 0;
        this._playButton.ariaLabel = this.options.translations.play;
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
        this._volumeSlider.ariaLabel = 'Volume';
        this._volumeSlider.classList.add('cinematicjs-video-volume-slider');
        _volumeWrapper.appendChild(this._volumeSlider);

        this._volumeButton = document.createElement('div');
        this._volumeButton.classList.add('cinematicjs-video-control-button');
        this._volumeButton.role = 'button';
        this._volumeButton.tabIndex = 0;
        this._volumeButton.ariaLabel = this.options.translations.mute;
        this._volumeButton.title = this.options.translations.mute;
        Cinematic.renderButtonIcon(this._volumeButton, 'sound');
        _volumeWrapper.appendChild(this._volumeButton);

        this._settingsWrapper = document.createElement('div');
        this._settingsWrapper.classList.add('cinematicjs-video-control-dropdown');
        this._controls.appendChild(this._settingsWrapper);

        this._settingsButton = document.createElement('div');
        this._settingsButton.classList.add('cinematicjs-video-control-button');
        this._settingsButton.role = 'button';
        this._settingsButton.tabIndex = 0;
        this._settingsButton.ariaLabel = this.options.translations.mute;
        this._settingsButton.ariaExpanded = 'false';
        this._settingsButton.title = this.options.translations.settings;
        Cinematic.renderButtonIcon(this._settingsButton, 'settings');
        this._settingsWrapper.appendChild(this._settingsButton);

        globalThis.addEventListener('click', (event) => {
            // Clicks inside the Dropdown should not close it again.
            if (!(event.target instanceof Element) || !(event.target).matches('.cinematicjs-video-control-dropdown, .cinematicjs-video-control-dropdown *')) {
                this._settingsWrapper.classList.remove('cinematicjs-dropdown-active');
                this._settingsButton.ariaExpanded = 'false';
            }
        });

        const _dropDownContent = document.createElement('div');
        _dropDownContent.classList.add('cinematicjs-video-dropdown-content');
        this._settingsWrapper.appendChild(_dropDownContent);

        // Adds keyboard support for closing the dropdown with Escape
        _dropDownContent.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this._settingsWrapper.classList.remove('cinematicjs-dropdown-active');
                this._settingsWrapper.ariaExpanded = 'false';
                this._settingsButton.focus();
            }
        });

        // Close dropdown when focus moves outside of it
        _dropDownContent.addEventListener('focusout', (event: FocusEvent) => {
            // Use setTimeout to allow the browser to update document.activeElement
            setTimeout(() => {
                const activeElement = document.activeElement;
                // Check if the new focus target is outside the dropdown
                if (activeElement && !this._settingsWrapper.contains(activeElement)) {
                    this._settingsWrapper.classList.remove('cinematicjs-dropdown-active');
                    this._settingsButton.ariaExpanded = 'false';
                }
            }, 0);
        });

        this._qualitySettingsSection = document.createElement('div');
        this._qualitySettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(this._qualitySettingsSection);

        const _qualitySettingsTitle = document.createElement('span');
        _qualitySettingsTitle.textContent = this.options.translations.quality;
        this._qualitySettingsSection.appendChild(_qualitySettingsTitle);

        this._qualitySelect = document.createElement('select');
        this._qualitySelect.name = 'quality';
        this._qualitySelect.ariaLabel = this.options.translations.quality;
        this._qualitySelect.tabIndex = 0;
        this._qualitySelect.addEventListener('change', () => {
            this.handleQualityChange(this._qualitySelect.value);
            // Return focus to quality select after change
            setTimeout(() => {
                this._qualitySelect.focus();
            }, 100);
        });

        // Track mouse interactions to prevent focus styles on click
        let isMouseDown = false;
        this._qualitySelect.addEventListener('mousedown', () => {
            isMouseDown = true;
            this._qualitySelect.classList.add('mouse-focus');
        });
        this._qualitySelect.addEventListener('focus', () => {
            if (!isMouseDown) {
                this._qualitySelect.classList.remove('mouse-focus');
            }
            isMouseDown = false;
        });
        this._qualitySelect.addEventListener('blur', () => {
            this._qualitySelect.classList.remove('mouse-focus');
        });

        this.renderQualityOptions();

        this._qualitySettingsSection.appendChild(this._qualitySelect);

        const _speedSettingsSection = document.createElement('div');
        _speedSettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(_speedSettingsSection);

        const _speedSettingsTitle = document.createElement('span');
        _speedSettingsTitle.textContent = this.options.translations.playbackSpeed;
        _speedSettingsSection.appendChild(_speedSettingsTitle);

        const _speedSelect = document.createElement('select');
        _speedSelect.name = 'speed';
        _speedSelect.ariaLabel = this.options.translations.playbackSpeed
        _speedSelect.tabIndex = 0;
        _speedSelect.addEventListener('change', () => {
            this.handleSpeedChange(_speedSelect.value);
            // Return focus to speed select after change
            setTimeout(() => {
                _speedSelect.focus();
            }, 100);
        });

        // Track mouse interactions to prevent focus styles on click
        let speedMouseDown = false;
        _speedSelect.addEventListener('mousedown', () => {
            speedMouseDown = true;
            _speedSelect.classList.add('mouse-focus');
        });
        _speedSelect.addEventListener('focus', () => {
            if (!speedMouseDown) {
                _speedSelect.classList.remove('mouse-focus');
            }
            speedMouseDown = false;
        });
        _speedSelect.addEventListener('blur', () => {
            _speedSelect.classList.remove('mouse-focus');
        });

        for (const speedSetting of [0.5, 1, 1.25, 1.5, 1.75, 2]) {
            const _option = document.createElement('option');
            _option.textContent = speedSetting + 'x';
            _option.value = speedSetting + '';
            _speedSelect.appendChild(_option);
        }

        _speedSelect.value = '1';
        _speedSettingsSection.appendChild(_speedSelect);

        if (this.options.deeplink) {
            this._deeplinkButton = document.createElement('div');
            this._deeplinkButton.classList.add('cinematicjs-video-control-button');
            this._deeplinkButton.role = 'button';
            this._deeplinkButton.tabIndex = 0;
            this._deeplinkButton.ariaLabel = this.options.translations.deeplink;
            this._deeplinkButton.title = this.options.translations.deeplink;
            this._deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
            Cinematic.renderButtonIcon(this._deeplinkButton, 'deeplink');
            this._controls.appendChild(this._deeplinkButton);
        }

        this._cuesContainer = document.createElement('div');
        this._cuesContainer.classList.add('cinematicjs-video-cues-container', 'cinematicjs-hidden');
        this._container.appendChild(this._cuesContainer);

        this._cues = document.createElement('div');
        this._cues.classList.add('video-cues', 'cinematicjs-hidden');
        this._cuesContainer.appendChild(this._cues);

        this._captionsButton = document.createElement('div');
        this._captionsButton.classList.add('cinematicjs-video-control-button');
        this._captionsButton.role = 'button';
        this._captionsButton.tabIndex = 0;
        this._captionsButton.ariaLabel = this.options.translations.showSubtitles;
        this._captionsButton.ariaPressed = 'false';
        this._captionsButton.title = this.options.translations.showSubtitles;
        Cinematic.renderButtonIcon(this._captionsButton, 'expanded-cc');
        this._controls.appendChild(this._captionsButton);

        this.prepareSubtitles();

        if (this.pipEnabled) {
            this._pipButton = document.createElement('div');
            this._pipButton.classList.add('cinematicjs-video-control-button');
            this._pipButton.role = 'button';
            this._pipButton.tabIndex = 0;
            this._pipButton.ariaLabel = this.options.translations.pictureInPicture;
            this._pipButton.title = this.options.translations.pictureInPicture;
            Cinematic.renderButtonIcon(this._pipButton, 'inpicture');
            this._controls.appendChild(this._pipButton);
        }

        this._fullScreenButton = document.createElement('div');
        this._fullScreenButton.classList.add('cinematicjs-video-control-button', 'cinematicjs-hidden');
        this._fullScreenButton.role = 'button';
        this._fullScreenButton.tabIndex = 0;
        this._fullScreenButton.ariaLabel = this.options.translations.fullscreen;
        this._fullScreenButton.title = this.options.translations.fullscreen;
        Cinematic.renderButtonIcon(this._fullScreenButton, 'fullscreen');
        this._controls.appendChild(this._fullScreenButton);
    }

    private updateVideoSourceElements(sources: VideoSource[]) {
        let _previousSource: HTMLSourceElement | null = null;
        for (const source of sources) {
            let _source = this._sources.get(source.type);
            if (_source) {
                // Update the existing source element
                _source.src = source.source;
                _previousSource = _source;
                return;
            }

            // Create a new source element.
            _source = document.createElement('source');
            _source.src = source.source;
            _source.type = source.type;
            this._sources.set(source.type, _source);

            if (_previousSource) {
                // Insert the new source element after the previous one.
                _previousSource.insertAdjacentElement('afterend', _source);
            } else {
                // Insert the first source element at the beginning of the video element.
                this._video.insertBefore(_source, this._video.firstChild);
            }

            _previousSource = _source;
        }

        // Remove all source elements that are not contained in the new sources array.
        this._sources.forEach((_source, type) => {
            if (!sources.some(source => source.type === type)) {
                _source.remove();
                this._sources.delete(type);
            }
        });
    }

    private renderQualityOptions() {
        this._qualitySelect.textContent = '';

        if (this.playlist.getCurrentVideo().sources.length > 1) {
            for (const source of this.playlist.getCurrentVideo().sources) {
                const _option = document.createElement('option');
                _option.textContent = source.quality;
                _option.value = source.quality;
                this._qualitySelect.appendChild(_option);
            }

            this._qualitySelect.value = this.quality;
            this._qualitySettingsSection.classList.remove('cinematicjs-hidden');
        } else {
            this._qualitySettingsSection.classList.add('cinematicjs-hidden');
        }
    }

    /**
     * Falls back to the best available quality for the current video when it does not provide the given quality.
     *
     * @param newQuality the preferred quality to play
     * @private
     */
    private handleVideoQualityFallback(newQuality: string) {
        if (!newQuality) {
            return newQuality;
        }

        let currentVideo = this.playlist.getCurrentVideo();
        let newSource = currentVideo.getSourcesForQuality(newQuality);
        if (!newSource) {
            newQuality = currentVideo.getBestAvailableQuality();
        }

        return newQuality;
    }

    private handleQualityChange(newQuality: string) {
        if (!newQuality) {
            return;
        }

        newQuality = this.handleVideoQualityFallback(newQuality);
        let newSource = this.playlist.getCurrentVideo().getSourcesForQuality(newQuality);
        if (!newSource) {
            return;
        }

        if (this.options.rememberQuality) {
            this.writeToLocalStore('quality', newQuality);
        }

        const currentTime = this._video.currentTime;
        const wasPlaying = !this._video.paused;

        // Set flag to prevent focus changes during quality change
        this._isChangingQuality = true;

        this.updateVideoSourceElements(newSource.sources);

        this._video.load();
        this._video.currentTime = currentTime;
        this._video.playbackRate = this.speed;
        if (wasPlaying) {
            this._video.play();
        }
        this.quality = newQuality;

        // Reset flag after quality change completes
        setTimeout(() => {
            this._isChangingQuality = false;
        }, 200);
    }

    private handleSpeedChange(newSpeed: string | number) {
        if (!newSpeed) {
            return;
        }
        this.speed = typeof newSpeed === 'string' ? Number.parseFloat(newSpeed) : newSpeed;
        this._video.playbackRate = this.speed;
    }

    private handleVideoInfoToggle() {
        this._videoDescription.classList.toggle('cinematicjs-hidden');
        const isHidden = this._videoDescription.classList.contains('cinematicjs-hidden');
        if (isHidden) {
            this._videoInfoButton.title = this.options.translations.showVideoInfo;
            this._videoInfoButton.ariaLabel = this.options.translations.showVideoInfo;
            this._videoInfoButton.ariaExpanded = 'false';
        } else {
            this._videoInfoButton.title = this.options.translations.hideVideoInfo;
            this._videoInfoButton.ariaLabel = this.options.translations.hideVideoInfo;
            this._videoInfoButton.ariaExpanded = 'true';
        }
    }

    private prepareSubtitles() {
        let _oldTrack = this._video.querySelector('track');
        if (_oldTrack) {
            _oldTrack.remove();
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

        if (_subtitles.readyState === 2) {
            this.handleLoadedTrack();
        } else {
            _subtitles.addEventListener('load', () => this.handleLoadedTrack());
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

        // Helper function to add both click and keyboard support to buttons
        const addButtonHandler = (_button: HTMLElement, handler: (event?: Event) => void) => {
            _button.addEventListener('click', (event) => handler(event));
            _button.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handler(event);
                }
            });
        };

        window.addEventListener('resize', () => this.handlePlayerResize());
        this.handlePlayerResize();

        if (globalThis.ResizeObserver) {
            new ResizeObserver(() => this.handlePlayerResize()).observe(this._container);
        }

        addButtonHandler(this._playButton, (event) => {
            this._playButtonKeyboardActivated = event instanceof KeyboardEvent;
            if (this._video.ended) {
                this.playlist.resetToBeginning();
                this.handleVideoChange();
            } else if (this._video.paused) {
                this._video.play();
            } else {
                this._video.pause();
            }
        });

        addButtonHandler(this._volumeButton, () => {
            this._video.muted = !this._video.muted;
        });

        // Settings button handler
        addButtonHandler(this._settingsButton, (event) => {
            this._settingsWrapper.classList.toggle('cinematicjs-dropdown-active');
            const isExpanded = this._settingsWrapper.classList.contains('cinematicjs-dropdown-active');
            this._settingsButton.ariaExpanded = isExpanded.toString();

            // Only focus the select element when opening via keyboard, not mouse
            if (isExpanded && event instanceof KeyboardEvent) {
                setTimeout(() => {
                    if (this._qualitySettingsSection.classList.contains('cinematicjs-hidden')) {
                        // If quality select is hidden, focus speed select
                        const speedSelect = this._settingsWrapper.querySelector('select[name="speed"]') as HTMLSelectElement;
                        if (speedSelect) {
                            speedSelect.focus();
                        }
                    } else {
                        this._qualitySelect.focus();
                    }
                }, 0);
            }

            if (event) {
                event.stopPropagation();
            }
        });

        this._volumeSlider.addEventListener('change', () => {
            // To allow the user to change from mute to a specific volume via the slider.
            this._video.muted = false;
            this._video.volume = this.volume = Number.parseFloat(this._volumeSlider.value);
        });

        this._video.addEventListener('loadedmetadata', function () {
            me.totalSeconds = this.duration;
            me._progressBar.setAttribute('max', me.totalSeconds.toString());
            me._bufferBar.setAttribute('max', me.totalSeconds.toString());
            me.updateTimer();

            if (me.options.startTime > 0) {
                this.currentTime = me.options.startTime;
            }

            me.fullScreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || me._video.webkitSupportsFullscreen;
            me._fullScreenButton.classList.toggle('cinematicjs-hidden', !me.fullScreenEnabled);
        });

        this._video.addEventListener('timeupdate', function () {
            me.playedSeconds = this.currentTime;
            me._progressBar.value = me.playedSeconds;

            // Update aria-valuenow for accessibility
            const percentage = me.totalSeconds > 0 ? Math.round((me.playedSeconds / me.totalSeconds) * 100) : 0;
            me._progressBar.ariaValueNow = percentage.toString();

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
                this._volumeButton.ariaLabel = this.options.translations.unmute;
            } else {
                this._volumeSlider.value = this._video.volume.toString();
                this._volumeButton.title = this.options.translations.mute;
                this._volumeButton.ariaLabel = this.options.translations.mute;
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
            me._playButton.ariaLabel = me.options.translations.pause;

            // Don't change focus during quality changes
            if (!me._isChangingQuality) {
                // Only focus the video if the play button wasn't activated via keyboard
                if (me._playButtonKeyboardActivated) {
                    // Keep focus on the play button for keyboard users
                    me._playButton.focus();
                } else {
                    me._video.focus();
                }
            }
            me._playButtonKeyboardActivated = false;

            // Shows the timer even when the video container is invisible during initialization of the player
            this.handlePlayerResize();
        });

        this._video.addEventListener('pause', () => {
            Cinematic.switchButtonIcon(me._playButton, 'play');
            me._playButton.title = me.options.translations.play;
            me._playButton.ariaLabel = me.options.translations.play;

            // Return focus to the play button if it was keyboard activated
            if (me._playButtonKeyboardActivated) {
                me._playButton.focus();
            }
            me._playButtonKeyboardActivated = false;
        });

        this._video.addEventListener('ended', () => {
            if (this.playlist.shouldPlayNextVideo()) {
                this.playlist.startNextVideo();
                this.handleVideoChange();
            } else {
                Cinematic.switchButtonIcon(this._playButton, 'repeat');
                this._playButton.title = me.options.translations.restart;
                this._playButton.ariaLabel = me.options.translations.restart;
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
            globalThis.setTimeout(() => {
                if (this._video.ended) {
                    this.playlist.resetToBeginning();
                    this.handleVideoChange();
                    this.showOverlay('play', null, true);
                } else if (me._video.paused) {
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

        // Show controls when a video element receives focus
        this._video.addEventListener('focus', () => {
            this.userActive = true;
            this.showControls();
        });

        // Keep controls visible when keyboard navigating through them
        this._controls.addEventListener('focusin', () => {
            this.userActive = true;
            this.showControls();
        });

        this._progressBar.addEventListener('focus', () => {
            this.userActive = true;
            this.showControls();
        });

        this.userActiveCheck = globalThis.setInterval(() => {
            if (!this.userActive) {
                return;
            }

            this.userActive = false;

            this.showControls();

            clearTimeout(this.userInactiveTimeout);

            this.userInactiveTimeout = globalThis.setTimeout(() => {
                // Check if any control element has focus
                const _activeElement = document.activeElement;
                const hasControlFocus = _activeElement && (
                    _activeElement.parentElement == this._controls ||
                    _activeElement == this._progressBar ||
                    _activeElement == this._volumeSlider ||
                    this._controls.contains(_activeElement as Node)
                );

                // We don't want to hide the controls when:
                // - The settings popup is currently open/visible
                // - Any control element has keyboard focus
                if (!this.userActive && !this._settingsWrapper.classList.contains('cinematicjs-dropdown-active') && !hasControlFocus) {
                    this.hideControls();

                    if (_activeElement && _activeElement.parentElement == this._controls) {
                        // We put focus on the video element so hotkeys work again after a control bar button is pressed
                        // and the user is inactive again.
                        this._video.focus();
                    }
                }
            }, 2000);


        }, 250);

        this._progressBar.addEventListener('click', function (event) {
            const _target = event.target as HTMLElement;
            const rect = _target.getBoundingClientRect();
            const pos = (event.clientX - rect.left) / this.offsetWidth;
            me._video.currentTime = pos * me._video.duration;
        });

        addButtonHandler(this._fullScreenButton, () => me.toggleFullScreen());

        document.addEventListener('fullscreenchange', () => this.handleFullScreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullScreenChange());

        if (this.options.deeplink) {
            addButtonHandler(this._deeplinkButton, () => {
                if (!this.options.deeplinkCallback || this.options.deeplinkCallback.call(this)) {
                    me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
                }
            });
        }

        addButtonHandler(this._captionsButton, () => {
            me._cuesContainer.classList.toggle('cinematicjs-hidden');
            if (me.captionsEnabled) {
                me._captionsButton.title = me.options.translations.showSubtitles;
                me._captionsButton.ariaLabel = me.options.translations.showSubtitles;
                me._captionsButton.ariaPressed = 'false';
                Cinematic.switchButtonIcon(me._captionsButton, 'expanded-cc');
            } else {
                me._captionsButton.title = me.options.translations.hideSubtitles;
                me._captionsButton.ariaLabel = me.options.translations.hideSubtitles;
                me._captionsButton.ariaPressed = 'true';
                Cinematic.switchButtonIcon(me._captionsButton, 'cc');
            }
            me.captionsEnabled = !me.captionsEnabled;
        });

        if (this.pipEnabled) {
            addButtonHandler(this._pipButton, async () => {
                try {
                    if (this._video === document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else {
                        await this._video.requestPictureInPicture();
                    }
                } catch (error) {
                    console.error(error)
                }
            });
        }

        if (this.options.closeCallback) {
            addButtonHandler(this._closeButton, () => {
                if (this.isFullScreen()) {
                    this.toggleFullScreen();
                }
                this.options.closeCallback?.apply(this);
            });
        }

        // Add keyboard handler for video info button
        addButtonHandler(this._videoInfoButton, () => this.handleVideoInfoToggle());

        // Add keyboard handler for chromecast button
        addButtonHandler(this._chromecastButton, () => {
            if (this._video.remote) {
                this._video.remote.prompt();
            }
        });

        this._video.addEventListener('keydown', event => {
            const {key} = event;

            event.preventDefault();
            event.stopPropagation();

            switch (key) {
                // Space bar allows pausing/resume the video
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
        this.handleSpeedChange(this.speed);
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
            this.overlayHideTimeout = globalThis.setTimeout(() => {
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
            if (globalThis.localStorage) {
                globalThis.localStorage.setItem('cinematic-js-' + name, value);
            }
        } catch (error) {
            console.log('CinematicJS: Cannot write to local store', {name: name, value: value, error: error});
        }
    }

    readFromLocalStore(name: string): string | null {
        try {
            if (globalThis.localStorage) {
                return globalThis.localStorage.getItem('cinematic-js-' + name);
            }
        } catch (error) {
            console.log('CinematicJS: Cannot read from local store', {name: name, error: error});
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
            this._fullScreenButton.ariaLabel = this.options.translations.exitFullscreen;
        } else {
            this._container.dataset.fullscreen = false;
            Cinematic.switchButtonIcon(this._fullScreenButton, 'fullscreen');
            this._fullScreenButton.title = this.options.translations.fullscreen;
            this._fullScreenButton.ariaLabel = this.options.translations.fullscreen;
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
        // Move element out of the screen horizontally
        fakeElem.style.position = 'absolute';
        fakeElem.style[document.documentElement.getAttribute('dir') == 'rtl' ? 'right' : 'left'] = '-9999px';
        // Move element to the same position vertically
        fakeElem.style.top = (window.scrollY || document.documentElement.scrollTop) + 'px';
        fakeElem.readOnly = true;
        fakeElem.value = text;
        document.body.appendChild(fakeElem);
        fakeElem.focus();

        const range = document.createRange();
        range.selectNodeContents(fakeElem);
        const selection = globalThis.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        fakeElem.setSelectionRange(0, text.length);

        if (document.execCommand('copy') && _element !== undefined) {
            _element.classList.add('cinematicjs-copied');
            setTimeout(function () {
                _element.classList.remove('cinematicjs-copied');
            }, 2000);
        }
        fakeElem.remove();

        // Return focus to the button after copying
        if (_element) {
            _element.focus();
        }

        /* Try alternative */
        const copy = function (event: ClipboardEvent) {
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', text);
            } else if ((<any>globalThis).clipboardData) {
                (<any>globalThis).clipboardData.setData('Text', text);
            }
            event.preventDefault();
        }

        globalThis.addEventListener('copy', copy);
        document.execCommand('copy');
        globalThis.removeEventListener('copy', copy);
    }

    private static getEpsilon(): number {
        if (Number.EPSILON) {
            return Number.EPSILON;
        }
        let epsilon = 1;
        while ((1 + 0.5 * epsilon) !== 1) {
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
