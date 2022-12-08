'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class MemoryCache {
    constructor() {
        this.values = new Map();
    }
    put(key, value) {
        //console.debug('MemoryCache.put', {key, value});
        this.values.set(key, value);
    }
    get(key, defaultValue) {
        //console.debug('MemoryCache.get', {key, defaultValue});
        return this.values.has(key) ? this.values.get(key) : defaultValue;
    }
    getFirst(keys, defaultValue) {
        //console.debug('MemoryCache.getFirst', {keys, defaultValue});
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            if (this.containsKey(key)) {
                return this.get(key, defaultValue);
            }
        }
        return defaultValue;
    }
    containsKey(key) {
        //console.debug('MemoryCache.containsKey', {key});
        return this.values.has(key);
    }
    getKeys() {
        //console.debug('MemoryCache.getKeys');
        return Array.from(this.values.keys());
    }
    clear() {
        //console.debug('MemoryCache.clear');
        this.values.clear();
    }
}

class SessionPasswordService {
    static setActive(isActive) {
        SessionPasswordService.isActive = isActive;
        if (!SessionPasswordService.isActive) {
            this.clear();
        }
    }
    /**
     *
     * @param minutesToExpire set to 0 to never expire
     */
    static setAutoExpire(minutesToExpire) {
        SessionPasswordService.baseMinutesToExpire = minutesToExpire;
        SessionPasswordService.updateExpiryTime();
    }
    static updateExpiryTime() {
        if (SessionPasswordService.baseMinutesToExpire == 0
            || SessionPasswordService.baseMinutesToExpire == null) {
            SessionPasswordService.expiryTime = null;
        }
        else {
            SessionPasswordService.expiryTime = Date.now() + SessionPasswordService.baseMinutesToExpire * 1000 * 60;
        }
        console.debug('SessionPasswordService.updateExpiryTime', { expiryTime: SessionPasswordService.expiryTime });
    }
    static put(pw, file) {
        console.debug('SessionPasswordService.put', { pw, file });
        console.debug(file.parent.path);
        this.cache.put(file.path, pw);
        this.cache.put(file.parent.path, pw);
        this.cache.put(file.basename, pw);
        SessionPasswordService.updateExpiryTime();
    }
    static getExact(file) {
        this.clearIfExpired();
        SessionPasswordService.updateExpiryTime();
        return this.cache.get(file.path, SessionPasswordService.blankPasswordAndHint);
    }
    static getBestGuess(file) {
        this.clearIfExpired();
        //console.debug('SessionPasswordService.getBestGuess', {file})
        SessionPasswordService.updateExpiryTime();
        const buestGuess = this.cache.getFirst([
            file.path,
            file.parent.path,
            file.basename
        ], SessionPasswordService.blankPasswordAndHint);
        console.debug('SessionPasswordService.getBestGuess', { file, buestGuess });
        return buestGuess;
    }
    static clearIfExpired() {
        if (SessionPasswordService.expiryTime == null) {
            return;
        }
        if (Date.now() < SessionPasswordService.expiryTime) {
            return;
        }
        this.clear();
    }
    static clear() {
        this.cache.clear();
    }
}
SessionPasswordService.isActive = true;
SessionPasswordService.blankPasswordAndHint = { password: '', hint: '' };
SessionPasswordService.cache = new MemoryCache();
SessionPasswordService.baseMinutesToExpire = 0;
SessionPasswordService.expiryTime = null;

class MeldEncryptSettingsTab extends obsidian.PluginSettingTab {
    constructor(app, plugin, settings, features) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = settings;
        this.features = features;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h1', { text: 'Settings for Meld Encrypt' });
        // build common settings
        new obsidian.Setting(containerEl)
            .setHeading()
            .setName('Common Settings');
        new obsidian.Setting(containerEl)
            .setName('Confirm password?')
            .setDesc('Confirm password when encrypting.')
            .addToggle(toggle => {
            toggle
                .setValue(this.settings.confirmPassword)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.settings.confirmPassword = value;
                yield this.plugin.saveSettings();
            }));
        });
        const updateRememberPasswordSettingsUi = () => {
            if (!this.settings.rememberPassword) {
                pwTimeoutSetting.settingEl.hide();
                return;
            }
            pwTimeoutSetting.settingEl.show();
            const rememberPasswordTimeout = this.settings.rememberPasswordTimeout;
            let timeoutString = `${rememberPasswordTimeout} minutes`;
            if (rememberPasswordTimeout == 0) {
                timeoutString = 'Never forget';
            }
            pwTimeoutSetting.setName(`Remember Password Timeout (${timeoutString})`);
        };
        new obsidian.Setting(containerEl)
            .setName('Remember password?')
            .setDesc('Remember the last used passwords when encrypting or decrypting.')
            .addToggle(toggle => {
            toggle
                .setValue(this.settings.rememberPassword)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.settings.rememberPassword = value;
                yield this.plugin.saveSettings();
                SessionPasswordService.setActive(this.settings.rememberPassword);
                updateRememberPasswordSettingsUi();
            }));
        });
        const pwTimeoutSetting = new obsidian.Setting(containerEl)
            .setDesc('The number of minutes to remember passwords.')
            .addSlider(slider => {
            slider
                .setLimits(0, 120, 5)
                .setValue(this.settings.rememberPasswordTimeout)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.settings.rememberPasswordTimeout = value;
                yield this.plugin.saveSettings();
                SessionPasswordService.setAutoExpire(this.settings.rememberPasswordTimeout);
                updateRememberPasswordSettingsUi();
            }));
        });
        updateRememberPasswordSettingsUi();
        // build feature settings
        this.features.forEach(f => {
            f.buildSettingsUi(containerEl, () => __awaiter(this, void 0, void 0, function* () { return yield this.plugin.saveSettings(); }));
        });
    }
}

const vectorSize = 16;
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
const iterations = 1000;
const salt = utf8Encoder.encode('XHWnDAT6ehMVY2zD');
class CryptoHelper {
    deriveKey(password) {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = utf8Encoder.encode(password);
            const key = yield crypto.subtle.importKey('raw', buffer, { name: 'PBKDF2' }, false, ['deriveKey']);
            const privateKey = crypto.subtle.deriveKey({
                name: 'PBKDF2',
                hash: { name: 'SHA-256' },
                iterations,
                salt
            }, key, {
                name: 'AES-GCM',
                length: 256
            }, false, ['encrypt', 'decrypt']);
            return privateKey;
        });
    }
    encryptToBytes(text, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = yield this.deriveKey(password);
            const textBytesToEncrypt = utf8Encoder.encode(text);
            const vector = crypto.getRandomValues(new Uint8Array(vectorSize));
            // encrypt into bytes
            const encryptedBytes = new Uint8Array(yield crypto.subtle.encrypt({ name: 'AES-GCM', iv: vector }, key, textBytesToEncrypt));
            const finalBytes = new Uint8Array(vector.byteLength + encryptedBytes.byteLength);
            finalBytes.set(vector, 0);
            finalBytes.set(encryptedBytes, vector.byteLength);
            return finalBytes;
        });
    }
    convertToString(bytes) {
        let result = '';
        for (let idx = 0; idx < bytes.length; idx++) {
            // append to result
            result += String.fromCharCode(bytes[idx]);
        }
        return result;
    }
    encryptToBase64(text, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalBytes = yield this.encryptToBytes(text, password);
            //convert array to base64
            const base64Text = btoa(this.convertToString(finalBytes));
            return base64Text;
        });
    }
    stringToArray(str) {
        var result = [];
        for (var i = 0; i < str.length; i++) {
            result.push(str.charCodeAt(i));
        }
        return new Uint8Array(result);
    }
    decryptFromBytes(encryptedBytes, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // extract iv
                const vector = encryptedBytes.slice(0, vectorSize);
                // extract encrypted text
                const encryptedTextBytes = encryptedBytes.slice(vectorSize);
                const key = yield this.deriveKey(password);
                // decrypt into bytes
                let decryptedBytes = yield crypto.subtle.decrypt({ name: 'AES-GCM', iv: vector }, key, encryptedTextBytes);
                // convert bytes to text
                let decryptedText = utf8Decoder.decode(decryptedBytes);
                return decryptedText;
            }
            catch (e) {
                //console.error(e);
                return null;
            }
        });
    }
    decryptFromBase64(base64Encoded, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let bytesToDecode = this.stringToArray(atob(base64Encoded));
                return yield this.decryptFromBytes(bytesToDecode, password);
                // // extract iv
                // const vector = bytesToDecode.slice(0,vectorSize);
                // // extract encrypted text
                // const encryptedTextBytes = bytesToDecode.slice(vectorSize);
                // const key = await this.deriveKey(password);
                // // decrypt into bytes
                // let decryptedBytes = await crypto.subtle.decrypt(
                // 	{name: 'AES-GCM', iv: vector},
                // 	key,
                // 	encryptedTextBytes
                // );
                // // convert bytes to text
                // let decryptedText = utf8Decoder.decode(decryptedBytes);
                // return decryptedText;
            }
            catch (e) {
                //console.error(e);
                return null;
            }
        });
    }
}

const algorithmObsolete = {
    name: 'AES-GCM',
    iv: new Uint8Array([196, 190, 240, 190, 188, 78, 41, 132, 15, 220, 84, 211]),
    tagLength: 128
};
class CryptoHelperObsolete {
    buildKey(password) {
        return __awaiter(this, void 0, void 0, function* () {
            let utf8Encode = new TextEncoder();
            let passwordBytes = utf8Encode.encode(password);
            let passwordDigest = yield crypto.subtle.digest({ name: 'SHA-256' }, passwordBytes);
            let key = yield crypto.subtle.importKey('raw', passwordDigest, algorithmObsolete, false, ['encrypt', 'decrypt']);
            return key;
        });
    }
    /**
    * @deprecated
    */
    encryptToBase64(text, password) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = yield this.buildKey(password);
            let utf8Encode = new TextEncoder();
            let bytesToEncrypt = utf8Encode.encode(text);
            // encrypt into bytes
            let encryptedBytes = new Uint8Array(yield crypto.subtle.encrypt(algorithmObsolete, key, bytesToEncrypt));
            //convert array to base64
            let base64Text = btoa(String.fromCharCode(...encryptedBytes));
            return base64Text;
        });
    }
    stringToArray(str) {
        var result = [];
        for (var i = 0; i < str.length; i++) {
            result.push(str.charCodeAt(i));
        }
        return new Uint8Array(result);
    }
    decryptFromBase64(base64Encoded, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // convert base 64 to array
                let bytesToDecrypt = this.stringToArray(atob(base64Encoded));
                let key = yield this.buildKey(password);
                // decrypt into bytes
                let decryptedBytes = yield crypto.subtle.decrypt(algorithmObsolete, key, bytesToDecrypt);
                // convert bytes to text
                let utf8Decode = new TextDecoder();
                let decryptedText = utf8Decode.decode(decryptedBytes);
                return decryptedText;
            }
            catch (e) {
                return null;
            }
        });
    }
}

class DecryptModal extends obsidian.Modal {
    constructor(app, title, text = '', showCopyButton) {
        super(app);
        this.decryptInPlace = false;
        this.titleEl.setText(title);
        this.text = text;
        this.showCopyButton = showCopyButton;
    }
    onOpen() {
        let { contentEl } = this;
        let cTextArea;
        const sText = new obsidian.Setting(contentEl)
            .addTextArea(cb => {
            cTextArea = cb;
            cb.setValue(this.text);
            cb.inputEl.setSelectionRange(0, 0);
            cb.inputEl.readOnly = true;
            cb.inputEl.rows = 10;
            cb.inputEl.style.width = '100%';
            cb.inputEl.style.minHeight = '3em';
            cb.inputEl.style.resize = 'vertical';
        });
        sText.settingEl.querySelector('.setting-item-info').remove();
        const sActions = new obsidian.Setting(contentEl);
        if (this.showCopyButton) {
            sActions
                .addButton(cb => {
                cb
                    .setButtonText('Copy')
                    .onClick(evt => {
                    navigator.clipboard.writeText(cTextArea.getValue());
                    new obsidian.Notice('Copied!');
                });
                if (!this.showCopyButton) ;
            });
        }
        sActions
            .addButton(cb => {
            cb
                .setWarning()
                .setButtonText('Decrypt in-place')
                .onClick(evt => {
                this.decryptInPlace = true;
                this.close();
            });
        });
    }
}

class UiHelper {
    /**
        Check if the Settings modal is open
    */
    static isSettingsModalOpen() {
        return document.querySelector('.mod-settings') !== null;
    }
    static buildPasswordSetting({ container, name, desc = '', autoFocus = false, placeholder = '', initialValue = '', onChangeCallback, onEnterCallback, }) {
        const sControl = new obsidian.Setting(container)
            .setName(name)
            .setDesc(desc)
            .addButton(cb => {
            cb
                .setIcon('reading-glasses')
                .onClick(evt => {
                // toggle view password
                const inputCtrl = sControl.components.find((bc, idx, obj) => bc instanceof obsidian.TextComponent);
                if (inputCtrl instanceof obsidian.TextComponent) {
                    inputCtrl.inputEl.type = inputCtrl.inputEl.type == 'password' ? 'text' : 'password';
                }
            });
        })
            .addText(tc => {
            tc.setPlaceholder(placeholder);
            tc.setValue(initialValue);
            tc.inputEl.type = 'password';
            if (onChangeCallback != null) {
                tc.onChange(onChangeCallback);
            }
            if (onEnterCallback != null) {
                tc.inputEl.onkeydown = (ev) => {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        onEnterCallback(tc.getValue());
                    }
                };
            }
            if (autoFocus) {
                setTimeout(() => tc.inputEl.focus(), 0);
            }
        });
        return sControl;
    }
}

class PasswordModal extends obsidian.Modal {
    constructor(app, isEncrypting, confirmPassword, defaultPassword = null, hint = null) {
        super(app);
        // input
        this.defaultPassword = null;
        this.defaultHint = null;
        // output
        this.resultConfirmed = false;
        this.resultPassword = null;
        this.resultHint = null;
        this.defaultPassword = defaultPassword;
        this.confirmPassword = confirmPassword;
        this.isEncrypting = isEncrypting;
        this.defaultHint = hint;
    }
    onOpen() {
        var _a, _b;
        let { contentEl } = this;
        contentEl.empty();
        //this.contentEl.style.width = 'auto';
        this.invalidate();
        let password = (_a = this.defaultPassword) !== null && _a !== void 0 ? _a : '';
        let confirmPass = '';
        let hint = (_b = this.defaultHint) !== null && _b !== void 0 ? _b : '';
        new obsidian.Setting(contentEl).setHeading().setName(this.isEncrypting ? 'Encrypting' : 'Decrypting');
        /* Main password input*/
        UiHelper.buildPasswordSetting({
            container: contentEl,
            name: 'Password:',
            placeholder: this.isEncrypting ? '' : `Hint: ${this.defaultHint}`,
            initialValue: password,
            autoFocus: true,
            onChangeCallback: (value) => {
                password = value;
                this.invalidate();
            },
            onEnterCallback: (value) => {
                password = value;
                this.invalidate();
                if (password.length > 0) {
                    if (sConfirmPassword.settingEl.isShown()) {
                        //tcConfirmPassword.inputEl.focus();
                        const elInp = sConfirmPassword.components.find((bc) => bc instanceof obsidian.TextComponent);
                        if (elInp instanceof obsidian.TextComponent) {
                            elInp.inputEl.focus();
                        }
                    }
                    else if (sHint.settingEl.isShown()) {
                        //tcHint.inputEl.focus();
                        const elInp = sHint.components.find((bc) => bc instanceof obsidian.TextComponent);
                        if (elInp instanceof obsidian.TextComponent) {
                            elInp.inputEl.focus();
                        }
                    }
                    else if (validate()) {
                        this.close();
                    }
                }
            }
        });
        /* End Main password input row */
        /* Confirm password input row */
        const sConfirmPassword = UiHelper.buildPasswordSetting({
            container: contentEl,
            name: 'Confirm Password:',
            onChangeCallback: (value) => {
                confirmPass = value;
                this.invalidate();
            },
            onEnterCallback: (value) => {
                confirmPass = value;
                this.invalidate();
                if (confirmPass.length > 0) {
                    if (validate()) {
                        if (sHint.settingEl.isShown()) {
                            //tcHint.inputEl.focus();
                            const elInp = sHint.components.find((bc) => bc instanceof obsidian.TextComponent);
                            if (elInp instanceof obsidian.TextComponent) {
                                elInp.inputEl.focus();
                            }
                        }
                    }
                }
            }
        });
        if (!this.confirmPassword) {
            sConfirmPassword.settingEl.hide();
        }
        /* End Confirm password input row */
        /* Hint input row */
        const sHint = new obsidian.Setting(contentEl)
            .setName('Optional Password Hint')
            .addText(tc => {
            //tcHint = tc;
            tc.inputEl.placeholder = `Password Hint`;
            tc.setValue(hint);
            tc.onChange(v => hint = v);
            tc.inputEl.on('keypress', '*', (ev, target) => {
                if (ev.key == 'Enter'
                    && target instanceof HTMLInputElement
                    && target.value.length > 0) {
                    ev.preventDefault();
                    if (validate()) {
                        this.close();
                    }
                }
            });
        });
        if (!this.isEncrypting) {
            sHint.settingEl.hide();
        }
        /* END Hint text row */
        new obsidian.Setting(contentEl).addButton(cb => {
            cb
                .setButtonText('Confirm')
                .onClick(evt => {
                if (validate()) {
                    this.close();
                }
            });
        });
        const validate = () => {
            this.invalidate();
            sConfirmPassword.setDesc('');
            if (this.confirmPassword) {
                if (password != confirmPass) {
                    // passwords don't match
                    sConfirmPassword.setDesc('Passwords don\'t match');
                    return false;
                }
            }
            this.resultConfirmed = true;
            this.resultPassword = password;
            this.resultHint = hint;
            return true;
        };
    }
    invalidate() {
        this.resultConfirmed = false;
        this.resultPassword = null;
        this.resultHint = null;
    }
}

const _PREFIX = '%%🔐';
const _PREFIX_OBSOLETE = _PREFIX + ' ';
const _PREFIX_A = _PREFIX + 'α ';
const _SUFFIX = ' 🔐%%';
const _HINT = '💡';
class FeatureInplaceEncrypt {
    onload(plugin, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin = plugin;
            this.pluginSettings = settings;
            this.featureSettings = settings.featureInplaceEncrypt;
            plugin.addCommand({
                id: 'meld-encrypt',
                name: 'Encrypt/Decrypt',
                icon: 'lock',
                editorCheckCallback: (checking, editor, view) => this.processEncryptDecryptCommand(checking, editor, view, false)
            });
            plugin.addCommand({
                id: 'meld-encrypt-in-place',
                name: 'Encrypt/Decrypt In-place',
                icon: 'lock',
                editorCheckCallback: (checking, editor, view) => this.processEncryptDecryptCommand(checking, editor, view, true)
            });
        });
    }
    onunload() {
    }
    buildSettingsUi(containerEl, saveSettingCallback) {
        new obsidian.Setting(containerEl)
            .setHeading()
            .setName('In-place Encryption Settings');
        // Selection encrypt feature settings below
        new obsidian.Setting(containerEl)
            .setName('Expand selection to whole line?')
            .setDesc('Partial selections will get expanded to the whole line.')
            .addToggle(toggle => {
            toggle
                .setValue(this.featureSettings.expandToWholeLines)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.featureSettings.expandToWholeLines = value;
                yield saveSettingCallback();
            }));
        });
        new obsidian.Setting(containerEl)
            .setName('Copy button?')
            .setDesc('Show a button to copy decrypted text.')
            .addToggle(toggle => {
            toggle
                .setValue(this.featureSettings.showCopyButton)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.featureSettings.showCopyButton = value;
                yield saveSettingCallback();
            }));
        });
    }
    processEncryptDecryptCommand(checking, editor, view, decryptInPlace) {
        if (checking && UiHelper.isSettingsModalOpen()) {
            // Settings is open, ensures this command can show up in other
            // plugins which list commands e.g. customizable-sidebar
            return true;
        }
        let startPos = editor.getCursor('from');
        let endPos = editor.getCursor('to');
        if (this.featureSettings.expandToWholeLines) {
            const startLine = startPos.line;
            startPos = { line: startLine, ch: 0 }; // want the start of the first line
            const endLine = endPos.line;
            const endLineText = editor.getLine(endLine);
            endPos = { line: endLine, ch: endLineText.length }; // want the end of last line
        }
        else {
            if (!editor.somethingSelected()) {
                // nothing selected, assume user wants to decrypt, expand to start and end markers
                startPos = this.getClosestPrevTextCursorPos(editor, _PREFIX, startPos);
                endPos = this.getClosestNextTextCursorPos(editor, _SUFFIX, endPos);
            }
        }
        const selectionText = editor.getRange(startPos, endPos);
        return this.processSelection(checking, editor, selectionText, startPos, endPos, decryptInPlace);
    }
    getClosestPrevTextCursorPos(editor, text, defaultValue) {
        const initOffset = editor.posToOffset(editor.getCursor("from"));
        for (let offset = initOffset; offset >= 0; offset--) {
            const offsetPos = editor.offsetToPos(offset);
            const textEndOffset = offset + text.length;
            const prefixEndPos = editor.offsetToPos(textEndOffset);
            const testText = editor.getRange(offsetPos, prefixEndPos);
            if (testText == text) {
                return offsetPos;
            }
        }
        return defaultValue;
    }
    getClosestNextTextCursorPos(editor, text, defaultValue) {
        const initOffset = editor.posToOffset(editor.getCursor("from"));
        const lastLineNum = editor.lastLine();
        let maxOffset = editor.posToOffset({ line: lastLineNum, ch: editor.getLine(lastLineNum).length });
        for (let offset = initOffset; offset <= maxOffset - text.length; offset++) {
            const offsetPos = editor.offsetToPos(offset);
            const textEndOffset = offset + text.length;
            const prefixEndPos = editor.offsetToPos(textEndOffset);
            const testText = editor.getRange(offsetPos, prefixEndPos);
            if (testText == text) {
                return prefixEndPos;
            }
        }
        return defaultValue;
    }
    analyseSelection(selectionText) {
        const result = new SelectionAnalysis();
        result.isEmpty = selectionText.length === 0;
        result.hasObsoleteEncryptedPrefix = selectionText.startsWith(_PREFIX_OBSOLETE);
        result.hasEncryptedPrefix = result.hasObsoleteEncryptedPrefix || selectionText.startsWith(_PREFIX_A);
        result.hasDecryptSuffix = selectionText.endsWith(_SUFFIX);
        result.containsEncryptedMarkers =
            selectionText.contains(_PREFIX_OBSOLETE)
                || selectionText.contains(_PREFIX_A)
                || selectionText.contains(_SUFFIX);
        result.canDecrypt = result.hasEncryptedPrefix && result.hasDecryptSuffix;
        result.canEncrypt = !result.hasEncryptedPrefix && !result.containsEncryptedMarkers;
        if (result.canDecrypt) {
            result.decryptable = this.parseDecryptableContent(selectionText);
            if (result.decryptable == null) {
                result.canDecrypt = false;
            }
        }
        return result;
    }
    processSelection(checking, editor, selectionText, finalSelectionStart, finalSelectionEnd, decryptInPlace, allowEncryption = true) {
        var _a;
        const selectionAnalysis = this.analyseSelection(selectionText);
        if (selectionAnalysis.isEmpty) {
            if (!checking) {
                new obsidian.Notice('Nothing to Encrypt.');
            }
            return false;
        }
        if (!selectionAnalysis.canDecrypt && !selectionAnalysis.canEncrypt) {
            if (!checking) {
                new obsidian.Notice('Unable to Encrypt or Decrypt that.');
            }
            return false;
        }
        if (selectionAnalysis.canEncrypt && !allowEncryption) {
            return false;
        }
        if (checking) {
            return true;
        }
        const activeFile = this.plugin.app.workspace.getActiveFile();
        // Fetch password from user
        // determine default password and hint
        let defaultPassword = '';
        let defaultHint = (_a = selectionAnalysis.decryptable) === null || _a === void 0 ? void 0 : _a.hint;
        if (this.pluginSettings.rememberPassword) {
            const bestGuessPasswordAndHint = SessionPasswordService.getBestGuess(activeFile);
            console.debug({ bestGuessPasswordAndHint });
            defaultPassword = bestGuessPasswordAndHint.password;
            defaultHint = defaultHint !== null && defaultHint !== void 0 ? defaultHint : bestGuessPasswordAndHint.hint;
        }
        const confirmPassword = selectionAnalysis.canEncrypt && this.pluginSettings.confirmPassword;
        const pwModal = new PasswordModal(this.plugin.app, selectionAnalysis.canEncrypt, confirmPassword, defaultPassword, defaultHint);
        pwModal.onClose = () => __awaiter(this, void 0, void 0, function* () {
            var _b, _c;
            if (!pwModal.resultConfirmed) {
                return;
            }
            const pw = (_b = pwModal.resultPassword) !== null && _b !== void 0 ? _b : '';
            const hint = (_c = pwModal.resultHint) !== null && _c !== void 0 ? _c : '';
            if (selectionAnalysis.canEncrypt) {
                const encryptable = new Encryptable();
                encryptable.text = selectionText;
                encryptable.hint = hint;
                this.encryptSelection(editor, encryptable, pw, finalSelectionStart, finalSelectionEnd);
                // remember password
                SessionPasswordService.put({ password: pw, hint: hint }, activeFile);
            }
            else {
                let decryptSuccess;
                if (selectionAnalysis.decryptable.version == 1) {
                    decryptSuccess = yield this.decryptSelection_a(editor, selectionAnalysis.decryptable, pw, finalSelectionStart, finalSelectionEnd, decryptInPlace);
                }
                else {
                    decryptSuccess = yield this.decryptSelectionObsolete(editor, selectionAnalysis.decryptable, pw, finalSelectionStart, finalSelectionEnd, decryptInPlace);
                }
                // remember password?
                if (decryptSuccess) {
                    SessionPasswordService.put({ password: pw, hint: hint }, activeFile);
                }
            }
        });
        pwModal.open();
        return true;
    }
    encryptSelection(editor, encryptable, password, finalSelectionStart, finalSelectionEnd) {
        return __awaiter(this, void 0, void 0, function* () {
            //encrypt
            const crypto = new CryptoHelper();
            const encodedText = this.encodeEncryption(yield crypto.encryptToBase64(encryptable.text, password), encryptable.hint);
            editor.setSelection(finalSelectionStart, finalSelectionEnd);
            editor.replaceSelection(encodedText);
        });
    }
    decryptSelection_a(editor, decryptable, password, selectionStart, selectionEnd, decryptInPlace) {
        return __awaiter(this, void 0, void 0, function* () {
            // decrypt
            const crypto = new CryptoHelper();
            const decryptedText = yield crypto.decryptFromBase64(decryptable.base64CipherText, password);
            if (decryptedText === null) {
                new obsidian.Notice('❌ Decryption failed!');
                return false;
            }
            else {
                if (decryptInPlace) {
                    editor.setSelection(selectionStart, selectionEnd);
                    editor.replaceSelection(decryptedText);
                }
                else {
                    const decryptModal = new DecryptModal(this.plugin.app, '🔓', decryptedText, this.featureSettings.showCopyButton);
                    decryptModal.onClose = () => {
                        editor.focus();
                        if (decryptModal.decryptInPlace) {
                            editor.setSelection(selectionStart, selectionEnd);
                            editor.replaceSelection(decryptedText);
                        }
                    };
                    decryptModal.open();
                }
            }
            return true;
        });
    }
    decryptSelectionObsolete(editor, decryptable, password, selectionStart, selectionEnd, decryptInPlace) {
        return __awaiter(this, void 0, void 0, function* () {
            // decrypt
            const base64CipherText = this.removeMarkers(decryptable.base64CipherText);
            const crypto = new CryptoHelperObsolete();
            const decryptedText = yield crypto.decryptFromBase64(base64CipherText, password);
            if (decryptedText === null) {
                new obsidian.Notice('❌ Decryption failed!');
                return false;
            }
            else {
                if (decryptInPlace) {
                    editor.setSelection(selectionStart, selectionEnd);
                    editor.replaceSelection(decryptedText);
                }
                else {
                    const decryptModal = new DecryptModal(this.plugin.app, '🔓', decryptedText, this.featureSettings.showCopyButton);
                    decryptModal.onClose = () => {
                        editor.focus();
                        if (decryptModal.decryptInPlace) {
                            editor.setSelection(selectionStart, selectionEnd);
                            editor.replaceSelection(decryptedText);
                        }
                    };
                    decryptModal.open();
                }
            }
            return true;
        });
    }
    parseDecryptableContent(text) {
        const result = new Decryptable();
        let content = text;
        if (content.startsWith(_PREFIX_A) && content.endsWith(_SUFFIX)) {
            result.version = 1;
            content = content.replace(_PREFIX_A, '').replace(_SUFFIX, '');
        }
        else if (content.startsWith(_PREFIX_OBSOLETE) && content.endsWith(_SUFFIX)) {
            result.version = 0;
            content = content.replace(_PREFIX_OBSOLETE, '').replace(_SUFFIX, '');
        }
        else {
            return null; // invalid format
        }
        // check if there is a hint
        if (content.substring(0, _HINT.length) == _HINT) {
            const endHintMarker = content.indexOf(_HINT, _HINT.length);
            if (endHintMarker < 0) {
                return null; // invalid format
            }
            result.hint = content.substring(_HINT.length, endHintMarker);
            result.base64CipherText = content.substring(endHintMarker + _HINT.length);
        }
        else {
            result.base64CipherText = content;
        }
        return result;
    }
    removeMarkers(text) {
        if (text.startsWith(_PREFIX_A) && text.endsWith(_SUFFIX)) {
            return text.replace(_PREFIX_A, '').replace(_SUFFIX, '');
        }
        if (text.startsWith(_PREFIX_OBSOLETE) && text.endsWith(_SUFFIX)) {
            return text.replace(_PREFIX_OBSOLETE, '').replace(_SUFFIX, '');
        }
        return text;
    }
    encodeEncryption(encryptedText, hint) {
        if (!encryptedText.contains(_PREFIX_OBSOLETE) && !encryptedText.contains(_PREFIX_A) && !encryptedText.contains(_SUFFIX)) {
            if (hint) {
                return _PREFIX_A.concat(_HINT, hint, _HINT, encryptedText, _SUFFIX);
            }
            return _PREFIX_A.concat(encryptedText, _SUFFIX);
        }
        return encryptedText;
    }
}
class SelectionAnalysis {
}
class Encryptable {
}
class Decryptable {
}

var EncryptedFileContentViewStateEnum;
(function (EncryptedFileContentViewStateEnum) {
    EncryptedFileContentViewStateEnum[EncryptedFileContentViewStateEnum["init"] = 0] = "init";
    EncryptedFileContentViewStateEnum[EncryptedFileContentViewStateEnum["decryptNote"] = 1] = "decryptNote";
    EncryptedFileContentViewStateEnum[EncryptedFileContentViewStateEnum["editNote"] = 2] = "editNote";
    EncryptedFileContentViewStateEnum[EncryptedFileContentViewStateEnum["changePassword"] = 3] = "changePassword";
    EncryptedFileContentViewStateEnum[EncryptedFileContentViewStateEnum["newNote"] = 4] = "newNote";
})(EncryptedFileContentViewStateEnum || (EncryptedFileContentViewStateEnum = {}));
const VIEW_TYPE_ENCRYPTED_FILE_CONTENT = "meld-encrypted-file-content-view";
class EncryptedFileContentView extends obsidian.TextFileView {
    constructor(leaf) {
        super(leaf);
        // State
        this.currentView = EncryptedFileContentViewStateEnum.init;
        this.encryptionPassword = '';
        this.hint = '';
        this.currentEditorText = '';
        //console.debug('EncryptedFileContentView.constructor', {leaf});
        this.elActionIconLockNote = this.addAction('lock', 'Lock', () => this.actionLockFile());
        this.elActionChangePassword = this.addAction('key', 'Change Password', () => this.actionChangePassword());
        this.contentEl.style.display = 'flex';
        this.contentEl.style.flexDirection = 'column';
        this.contentEl.style.alignItems = 'center';
    }
    actionLockFile() {
        this.encryptionPassword = '';
        this.refreshView(EncryptedFileContentViewStateEnum.decryptNote);
    }
    actionChangePassword() {
        this.refreshView(EncryptedFileContentViewStateEnum.changePassword);
    }
    onPaneMenu(menu, source) {
        //console.debug( {menu, source, 'view': this.currentView});
        if (source == 'tab-header' && this.currentView == EncryptedFileContentViewStateEnum.editNote) {
            menu.addItem(m => {
                m
                    .setSection('action')
                    .setIcon('lock')
                    .setTitle('Lock')
                    .onClick(() => this.actionLockFile());
            });
            menu.addItem(m => {
                m
                    .setSection('action')
                    .setIcon('key')
                    .setTitle('Change Password')
                    .onClick(() => this.actionChangePassword());
            });
        }
        super.onPaneMenu(menu, source);
    }
    createTitle(title) {
        return this.contentEl.createDiv({
            text: `🔐 ${title} 🔐`,
            attr: {
                style: 'margin-bottom:2em;'
            }
        });
    }
    validatePassword(pw) {
        if (pw.length == 0) {
            return 'Password is too short';
        }
        return '';
    }
    validateConfirm(pw, cpw) {
        const passwordMatch = pw === cpw;
        return passwordMatch ? '' : 'Password doesn\'t match';
    }
    createNewNoteView() {
        //console.debug('createDecryptNoteView', { "hint": this.hint} );
        const container = this.createInputContainer();
        new obsidian.Setting(container)
            .setDesc('Please provide a password and hint to start editing this note.');
        const submit = (password, confirm, hint) => __awaiter(this, void 0, void 0, function* () {
            var validPw = this.validatePassword(password);
            var validCpw = this.validateConfirm(password, confirm);
            sPassword.setDesc(validPw);
            sConfirm.setDesc(validCpw);
            if (validPw.length === 0 && validCpw.length === 0) {
                //set password and hint and open note
                this.encryptionPassword = password;
                this.hint = hint;
                this.currentEditorText = this.file.basename;
                yield this.encodeAndSave();
                SessionPasswordService.put({ password: password, hint: hint }, this.file);
                this.refreshView(EncryptedFileContentViewStateEnum.editNote);
            }
        });
        const bestGuessPassAndHint = SessionPasswordService.getBestGuess(this.file);
        let password = bestGuessPassAndHint.password;
        let confirm = '';
        let hint = bestGuessPassAndHint.hint;
        const sPassword = UiHelper.buildPasswordSetting({
            container,
            name: 'Password:',
            autoFocus: true,
            initialValue: password,
            onChangeCallback: (value) => {
                password = value;
                sPassword.setDesc(this.validatePassword(password));
                sConfirm.setDesc(this.validateConfirm(password, confirm));
            },
            onEnterCallback: (value) => {
                password = value;
                if (password.length > 0) {
                    sConfirm.controlEl.querySelector('input').focus();
                }
            }
        });
        const sConfirm = UiHelper.buildPasswordSetting({
            container,
            name: 'Confirm:',
            autoFocus: false,
            onChangeCallback: (value) => {
                confirm = value;
                sPassword.setDesc(this.validatePassword(password));
                sConfirm.setDesc(this.validateConfirm(password, confirm));
            },
            onEnterCallback: (value) => {
                confirm = value;
                const passwordMatch = password === confirm;
                if (passwordMatch) {
                    sHint.controlEl.querySelector('input').focus();
                }
            }
        });
        const sHint = new obsidian.Setting(container)
            .setName("Hint:")
            .addText((tc) => {
            tc.setValue(hint);
            tc.onChange(v => {
                hint = v;
            });
        });
        sHint.controlEl.on('keydown', '*', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                submit(password, confirm, hint);
            }
        });
        new obsidian.Setting(container)
            .addButton(bc => {
            bc
                .setCta()
                .setIcon('go-to-file')
                .setTooltip('Edit')
                .onClick((ev) => submit(password, confirm, hint));
        });
        return container;
    }
    createDecryptNoteView() {
        const container = this.createInputContainer();
        new obsidian.Setting(container)
            .setDesc('Please provide a password to unlock this note.');
        const bestGuessPassAndHint = SessionPasswordService.getBestGuess(this.file);
        this.encryptionPassword = bestGuessPassAndHint.password;
        UiHelper.buildPasswordSetting({
            container,
            name: 'Password:',
            initialValue: this.encryptionPassword,
            autoFocus: true,
            placeholder: this.formatHint(this.hint),
            onChangeCallback: (value) => {
                this.encryptionPassword = value;
            },
            onEnterCallback: () => __awaiter(this, void 0, void 0, function* () { return yield this.handleDecryptButtonClick(); })
        });
        new obsidian.Setting(container)
            .addButton(bc => {
            bc
                .setCta()
                .setIcon('checkmark')
                .setTooltip('Unlock & Edit')
                .onClick((evt) => this.handleDecryptButtonClick());
        });
        return container;
    }
    encodeAndSave() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //console.debug('encodeAndSave');
                var fileData = yield FileDataHelper.encode(this.encryptionPassword, this.hint, this.currentEditorText);
                this.data = JsonFileEncoding.encode(fileData);
                this.requestSave();
            }
            catch (e) {
                console.error(e);
                new obsidian.Notice(e, 10000);
            }
        });
    }
    createEditorView() {
        //const container = this.contentEl.createEl('textarea');
        const container = this.contentEl.createDiv();
        container.contentEditable = 'true';
        container.style.flexGrow = '1';
        container.style.alignSelf = 'stretch';
        //container.value = this.currentEditorText
        container.innerText = this.currentEditorText;
        container.focus();
        container.on('input', '*', (ev, target) => __awaiter(this, void 0, void 0, function* () {
            //console.debug('editor input',{ev, target});
            //this.currentEditorText = container.value;
            this.currentEditorText = container.innerText;
            yield this.encodeAndSave();
        }));
        return container;
    }
    createInputContainer() {
        return this.contentEl.createDiv({
            'attr': {
                'style': 'width:100%; max-width:400px;'
            }
        });
    }
    createChangePasswordView() {
        const container = this.createInputContainer();
        let newPassword = '';
        let confirm = '';
        let newHint = '';
        const submit = (newPassword, confirm, newHint) => __awaiter(this, void 0, void 0, function* () {
            var validPw = this.validatePassword(newPassword);
            var validCpw = this.validateConfirm(newPassword, confirm);
            sNewPassword.setDesc(validPw);
            sConfirm.setDesc(validCpw);
            if (validPw.length === 0 && validCpw.length === 0) {
                //set password and hint and open note
                //console.debug('createChangePasswordView submit');
                this.encryptionPassword = newPassword;
                this.hint = newHint;
                this.encodeAndSave();
                this.refreshView(EncryptedFileContentViewStateEnum.editNote);
                new obsidian.Notice('Password and Hint were changed');
            }
        });
        const sNewPassword = UiHelper.buildPasswordSetting({
            container,
            name: 'New Password:',
            autoFocus: true,
            onChangeCallback: (value) => {
                newPassword = value;
                sNewPassword.setDesc(this.validatePassword(newPassword));
                sConfirm.setDesc(this.validateConfirm(newPassword, confirm));
            },
            onEnterCallback: (value) => {
                newPassword = value;
                if (newPassword.length > 0) {
                    sConfirm.controlEl.querySelector('input').focus();
                }
            }
        });
        const sConfirm = UiHelper.buildPasswordSetting({
            container,
            name: 'Confirm:',
            onChangeCallback: (value) => {
                confirm = value;
                sNewPassword.setDesc(this.validatePassword(newPassword));
                sConfirm.setDesc(this.validateConfirm(newPassword, confirm));
            },
            onEnterCallback: (value) => {
                confirm = value;
                // validate confirm
                const passwordMatch = newPassword === confirm;
                if (passwordMatch) {
                    sHint.controlEl.querySelector('input').focus();
                }
            }
        });
        const sHint = new obsidian.Setting(container)
            .setName("New Hint:")
            .addText((tc) => {
            tc.onChange(v => {
                newHint = v;
            });
        });
        sHint.controlEl.on('keydown', '*', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                submit(newPassword, confirm, newHint);
            }
        });
        new obsidian.Setting(container)
            .addButton(bc => {
            bc
                .removeCta()
                .setIcon('cross')
                //.setButtonText('Cancel')
                .setTooltip('Cancel')
                .onClick(() => {
                this.refreshView(EncryptedFileContentViewStateEnum.editNote);
            });
        }).addButton(bc => {
            bc
                .setCta()
                .setIcon('checkmark')
                .setTooltip('Change Password')
                //.setButtonText('Change Password')
                .setWarning()
                .onClick((ev) => {
                submit(newPassword, confirm, newHint);
            });
        });
        return container;
    }
    formatHint(hint) {
        if (hint.length > 0) {
            return `Hint: ${hint}`;
        }
        else {
            return '';
        }
    }
    refreshView(newView) {
        //console.debug('refreshView',{'currentView':this.currentView, newView});
        this.elActionIconLockNote.hide();
        this.elActionChangePassword.hide();
        // clear view
        this.contentEl.empty();
        this.currentView = newView;
        switch (this.currentView) {
            case EncryptedFileContentViewStateEnum.newNote:
                this.createTitle('This note will be encrypted');
                this.createNewNoteView();
                break;
            case EncryptedFileContentViewStateEnum.decryptNote:
                this.createTitle('This note is encrypted');
                this.createDecryptNoteView();
                break;
            case EncryptedFileContentViewStateEnum.editNote:
                this.elActionIconLockNote.show();
                this.elActionChangePassword.show();
                this.createTitle('This note is encrypted');
                this.createEditorView();
                break;
            case EncryptedFileContentViewStateEnum.changePassword:
                this.createTitle('Change encrypted note password');
                this.createChangePasswordView();
                break;
        }
    }
    handleDecryptButtonClick() {
        return __awaiter(this, void 0, void 0, function* () {
            var fileData = JsonFileEncoding.decode(this.data);
            //console.debug('Decrypt button', fileData);
            const decryptedText = yield FileDataHelper.decrypt(fileData, this.encryptionPassword);
            if (decryptedText === null) {
                new obsidian.Notice('Decryption failed');
            }
            else {
                SessionPasswordService.put({ password: this.encryptionPassword, hint: this.hint }, this.file);
                this.currentEditorText = decryptedText;
                this.refreshView(EncryptedFileContentViewStateEnum.editNote);
            }
        });
    }
    // important
    canAcceptExtension(extension) {
        //console.debug('EncryptedFileContentView.canAcceptExtension', {extension});
        return extension == 'encrypted';
    }
    // important
    getViewType() {
        return VIEW_TYPE_ENCRYPTED_FILE_CONTENT;
    }
    // the data to show on the view
    setViewData(data, clear) {
        // console.debug('EncryptedFileContentView.setViewData', {
        // 	data,
        // 	clear,
        // 	'pass':this.encryptionPassword,
        // 	//'mode':this.getMode(),
        // 	//'mode-data':this.currentMode.get(),
        // 	//'preview-mode-data':this.previewMode.get()
        // });
        if (clear) {
            var newView;
            if (data === '') {
                // blank new file
                newView = EncryptedFileContentViewStateEnum.newNote;
            }
            else {
                newView = EncryptedFileContentViewStateEnum.decryptNote;
            }
            // new file, we don't know what the password is yet
            this.encryptionPassword = '';
            // json decode file data to get the Hint
            var fileData = JsonFileEncoding.decode(this.data);
            this.hint = fileData.hint;
            this.refreshView(newView);
        }
        else {
            this.leaf.detach();
            new obsidian.Notice('Multiple views of the same encrypted note isn\'t supported');
        }
    }
    // the data to save to disk
    getViewData() {
        // console.debug('EncryptedFileContentView.getViewData', {
        // 	'this':this,
        // 	'data':this.data,
        // });
        return this.data;
    }
    clear() {
        //console.debug('EncryptedFileContentView.clear');
    }
}
class FileData {
    constructor(hint, encodedData) {
        this.version = "1.0";
        this.hint = hint;
        this.encodedData = encodedData;
    }
}
class FileDataHelper {
    static encode(pass, hint, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const crypto = new CryptoHelper();
            const encryptedData = yield crypto.encryptToBase64(text, pass);
            return new FileData(hint, encryptedData);
        });
    }
    static decrypt(data, pass) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.encodedData == '') {
                return '';
            }
            const crypto = new CryptoHelper();
            return yield crypto.decryptFromBase64(data.encodedData, pass);
        });
    }
}
class JsonFileEncoding {
    static encode(data) {
        return JSON.stringify(data, null, 2);
    }
    static decode(encodedText) {
        //console.debug('JsonFileEncoding.decode',{encodedText});
        if (encodedText === '') {
            return new FileData("", "");
        }
        return JSON.parse(encodedText);
    }
}

class FeatureWholeNoteEncrypt {
    onload(plugin, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin = plugin;
            this.settings = settings.featureWholeNoteEncrypt;
            this.updateUiForSettings();
            this.plugin.registerView(VIEW_TYPE_ENCRYPTED_FILE_CONTENT, (leaf) => new EncryptedFileContentView(leaf));
            this.plugin.registerExtensions(['encrypted'], VIEW_TYPE_ENCRYPTED_FILE_CONTENT);
            this.plugin.addCommand({
                id: 'meld-encrypt-create-new-note',
                name: 'Create new encrypted note',
                icon: 'lock',
                checkCallback: (checking) => this.processCreateNewEncryptedNoteCommand(checking)
            });
        });
    }
    onunload() {
        this.plugin.app.workspace.detachLeavesOfType(VIEW_TYPE_ENCRYPTED_FILE_CONTENT);
    }
    processCreateNewEncryptedNoteCommand(checking) {
        //console.debug('processCreateNewEncryptedNoteCommand', {checking});
        try {
            if (checking || UiHelper.isSettingsModalOpen()) {
                return true;
            }
            let newFilename = obsidian.moment().format('[Untitled] YYYYMMDD hhmmss[.encrypted]');
            let newFileFolder;
            const activeFile = this.plugin.app.workspace.getActiveFile();
            if (activeFile != null) {
                newFileFolder = this.plugin.app.fileManager.getNewFileParent(activeFile.path);
            }
            else {
                newFileFolder = this.plugin.app.fileManager.getNewFileParent('');
            }
            const newFilepath = obsidian.normalizePath(newFileFolder.path + "/" + newFilename);
            //console.debug('processCreateNewEncryptedNoteCommand', {newFilepath});
            this.plugin.app.vault.create(newFilepath, '').then(f => {
                const leaf = this.plugin.app.workspace.getLeaf(false);
                leaf.openFile(f);
            }).catch(reason => {
                new obsidian.Notice(reason, 10000);
            });
            return true;
        }
        catch (e) {
            console.error(e);
            new obsidian.Notice(e, 10000);
        }
    }
    buildSettingsUi(containerEl, saveSettingCallback) {
        new obsidian.Setting(containerEl)
            .setHeading()
            .setName('Whole Note Encryption Settings');
        new obsidian.Setting(containerEl)
            .setName('Add ribbon icon to create note')
            .setDesc('Adds a ribbon icon to the left bar to create an encrypted note.')
            .addToggle(toggle => {
            toggle
                .setValue(this.settings.addRibbonIconToCreateNote)
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.settings.addRibbonIconToCreateNote = value;
                yield saveSettingCallback();
                this.updateUiForSettings();
            }));
        });
    }
    updateUiForSettings() {
        if (this.settings.addRibbonIconToCreateNote) {
            // turn on ribbon icon
            if (this.ribbonIconCreateNewNote == null) {
                this.ribbonIconCreateNewNote = this.plugin.addRibbonIcon('lock', 'Create new encrypted note', (ev) => {
                    this.processCreateNewEncryptedNoteCommand(false);
                });
            }
        }
        else {
            // turn off ribbon icon
            if (this.ribbonIconCreateNewNote != null) {
                this.ribbonIconCreateNewNote.remove();
                this.ribbonIconCreateNewNote = null;
            }
        }
    }
}

class MeldEncrypt extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.enabledFeatures = [];
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            // Settings
            yield this.loadSettings();
            this.enabledFeatures.push(new FeatureWholeNoteEncrypt(), new FeatureInplaceEncrypt());
            this.addSettingTab(new MeldEncryptSettingsTab(this.app, this, this.settings, this.enabledFeatures));
            // End Settings
            // load features
            this.enabledFeatures.forEach((f) => __awaiter(this, void 0, void 0, function* () {
                yield f.onload(this, this.settings);
            }));
        });
    }
    onunload() {
        this.enabledFeatures.forEach((f) => __awaiter(this, void 0, void 0, function* () {
            f.onunload();
        }));
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const DEFAULT_SETTINGS = {
                confirmPassword: true,
                rememberPassword: true,
                rememberPasswordTimeout: 30,
                featureWholeNoteEncrypt: {
                    addRibbonIconToCreateNote: true,
                },
                featureInplaceEncrypt: {
                    expandToWholeLines: false,
                    showCopyButton: true,
                }
            };
            this.settings = Object.assign(DEFAULT_SETTINGS, yield this.loadData());
            // apply settings
            SessionPasswordService.setActive(this.settings.rememberPassword);
            SessionPasswordService.setAutoExpire(this.settings.rememberPasswordTimeout == 0
                ? null
                : this.settings.rememberPasswordTimeout);
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}

module.exports = MeldEncrypt;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIi4uL3NyYy9zZXJ2aWNlcy9NZW1vcnlDYWNoZS50cyIsIi4uL3NyYy9zZXJ2aWNlcy9TZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLnRzIiwiLi4vc3JjL3NldHRpbmdzL01lbGRFbmNyeXB0U2V0dGluZ3NUYWIudHMiLCIuLi9zcmMvc2VydmljZXMvQ3J5cHRvSGVscGVyLnRzIiwiLi4vc3JjL3NlcnZpY2VzL0NyeXB0b0hlbHBlck9ic29sZXRlLnRzIiwiLi4vc3JjL2ZlYXR1cmVzL2ZlYXR1cmUtaW5wbGFjZS1lbmNyeXB0L0RlY3J5cHRNb2RhbC50cyIsIi4uL3NyYy9zZXJ2aWNlcy9VaUhlbHBlci50cyIsIi4uL3NyYy9mZWF0dXJlcy9mZWF0dXJlLWlucGxhY2UtZW5jcnlwdC9QYXNzd29yZE1vZGFsLnRzIiwiLi4vc3JjL2ZlYXR1cmVzL2ZlYXR1cmUtaW5wbGFjZS1lbmNyeXB0L0ZlYXR1cmVJbnBsYWNlRW5jcnlwdC50cyIsIi4uL3NyYy9mZWF0dXJlcy9mZWF0dXJlLXdob2xlLW5vdGUtZW5jcnlwdC9FbmNyeXB0ZWRGaWxlQ29udGVudFZpZXcudHMiLCIuLi9zcmMvZmVhdHVyZXMvZmVhdHVyZS13aG9sZS1ub3RlLWVuY3J5cHQvRmVhdHVyZVdob2xlTm90ZUVuY3J5cHQudHMiLCIuLi9zcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xyXG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcclxuICAgICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20sIHBhY2spIHtcclxuICAgIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGFyIHx8ICEoaSBpbiBmcm9tKSkge1xyXG4gICAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xyXG4gICAgICAgICAgICBhcltpXSA9IGZyb21baV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlmIChnW25dKSBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogbiA9PT0gXCJyZXR1cm5cIiB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHN0YXRlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiBraW5kID09PSBcIm1cIiA/IGYgOiBraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlcikgOiBmID8gZi52YWx1ZSA6IHN0YXRlLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBzdGF0ZSwgdmFsdWUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHdyaXRlIHByaXZhdGUgbWVtYmVyIHRvIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcclxuICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xyXG4gICAgcmV0dXJuIHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgPT09IHN0YXRlIDogc3RhdGUuaGFzKHJlY2VpdmVyKTtcclxufVxyXG4iLCJleHBvcnQgY2xhc3MgTWVtb3J5Q2FjaGU8VD4ge1xyXG5cclxuXHRwcml2YXRlIHZhbHVlcyA9IG5ldyBNYXA8c3RyaW5nLFQ+KCk7XHJcblxyXG5cdHB1YmxpYyBwdXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBUKTogdm9pZCB7XHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ01lbW9yeUNhY2hlLnB1dCcsIHtrZXksIHZhbHVlfSk7XHJcblx0XHR0aGlzLnZhbHVlcy5zZXQoIGtleSwgdmFsdWUgKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXQoa2V5OiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogVCk6IFQge1xyXG5cdFx0Ly9jb25zb2xlLmRlYnVnKCdNZW1vcnlDYWNoZS5nZXQnLCB7a2V5LCBkZWZhdWx0VmFsdWV9KTtcclxuXHRcdHJldHVybiB0aGlzLnZhbHVlcy5oYXMoa2V5KSA/IHRoaXMudmFsdWVzLmdldChrZXkpIDogZGVmYXVsdFZhbHVlO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldEZpcnN0KGtleXM6IHN0cmluZ1tdLCBkZWZhdWx0VmFsdWU6IFQpOiBUIHtcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygnTWVtb3J5Q2FjaGUuZ2V0Rmlyc3QnLCB7a2V5cywgZGVmYXVsdFZhbHVlfSk7XHJcblx0XHRcclxuXHRcdGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBrZXlzLmxlbmd0aDsgaW5kZXgrKykge1xyXG5cdFx0XHRjb25zdCBrZXkgPSBrZXlzW2luZGV4XTtcclxuXHRcdFx0aWYgKHRoaXMuY29udGFpbnNLZXkoa2V5KSkge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldChrZXksIGRlZmF1bHRWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmYXVsdFZhbHVlO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGNvbnRhaW5zS2V5KGtleTogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ01lbW9yeUNhY2hlLmNvbnRhaW5zS2V5Jywge2tleX0pO1xyXG5cdFx0cmV0dXJuIHRoaXMudmFsdWVzLmhhcyhrZXkpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldEtleXMoKTogc3RyaW5nW10ge1xyXG5cdFx0Ly9jb25zb2xlLmRlYnVnKCdNZW1vcnlDYWNoZS5nZXRLZXlzJyk7XHJcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSggdGhpcy52YWx1ZXMua2V5cygpICk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgY2xlYXIoKSB7XHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ01lbW9yeUNhY2hlLmNsZWFyJyk7XHJcblx0XHR0aGlzLnZhbHVlcy5jbGVhcigpO1xyXG5cdH1cclxufVxyXG4iLCJpbXBvcnQgeyBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBNZW1vcnlDYWNoZSB9IGZyb20gXCIuL01lbW9yeUNhY2hlXCI7XHJcblxyXG5pbnRlcmZhY2UgSVBhc3N3b3JkQW5kSGludHtcclxuXHRwYXNzd29yZDogc3RyaW5nO1xyXG5cdGhpbnQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNlc3Npb25QYXNzd29yZFNlcnZpY2V7XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGlzQWN0aXZlIDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGJsYW5rUGFzc3dvcmRBbmRIaW50IDogSVBhc3N3b3JkQW5kSGludCA9IHtwYXNzd29yZDonJywgaGludDonJyB9O1xyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBjYWNoZSA9IG5ldyBNZW1vcnlDYWNoZTxJUGFzc3dvcmRBbmRIaW50PigpO1xyXG5cdFxyXG5cdHByaXZhdGUgc3RhdGljIGJhc2VNaW51dGVzVG9FeHBpcmU6bnVtYmVyID0gMDtcclxuXHRwcml2YXRlIHN0YXRpYyBleHBpcnlUaW1lIDogbnVtYmVyID0gbnVsbDtcclxuXHJcblx0cHVibGljIHN0YXRpYyBzZXRBY3RpdmUoIGlzQWN0aXZlOiBib29sZWFuKSB7XHJcblx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLmlzQWN0aXZlID0gaXNBY3RpdmU7XHJcblx0XHRpZiAoIVNlc3Npb25QYXNzd29yZFNlcnZpY2UuaXNBY3RpdmUpe1xyXG5cdFx0XHR0aGlzLmNsZWFyKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBcclxuXHQgKiBAcGFyYW0gbWludXRlc1RvRXhwaXJlIHNldCB0byAwIHRvIG5ldmVyIGV4cGlyZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzdGF0aWMgc2V0QXV0b0V4cGlyZSggbWludXRlc1RvRXhwaXJlOm51bWJlciApIDogdm9pZHtcclxuXHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UuYmFzZU1pbnV0ZXNUb0V4cGlyZSA9IG1pbnV0ZXNUb0V4cGlyZTtcclxuXHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UudXBkYXRlRXhwaXJ5VGltZSgpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyB1cGRhdGVFeHBpcnlUaW1lKCkgOiB2b2lkIHtcclxuXHRcdGlmIChcclxuXHRcdFx0U2Vzc2lvblBhc3N3b3JkU2VydmljZS5iYXNlTWludXRlc1RvRXhwaXJlID09IDBcclxuXHRcdFx0fHwgU2Vzc2lvblBhc3N3b3JkU2VydmljZS5iYXNlTWludXRlc1RvRXhwaXJlID09IG51bGxcclxuXHRcdCl7XHJcblx0XHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UuZXhwaXJ5VGltZSA9IG51bGw7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLmV4cGlyeVRpbWUgPSBEYXRlLm5vdygpICsgU2Vzc2lvblBhc3N3b3JkU2VydmljZS5iYXNlTWludXRlc1RvRXhwaXJlICogMTAwMCAqIDYwO1xyXG5cdFx0fVxyXG5cdFx0Y29uc29sZS5kZWJ1ZygnU2Vzc2lvblBhc3N3b3JkU2VydmljZS51cGRhdGVFeHBpcnlUaW1lJywge2V4cGlyeVRpbWU6U2Vzc2lvblBhc3N3b3JkU2VydmljZS5leHBpcnlUaW1lfSk7XHJcblx0fVxyXG5cdFxyXG5cdHB1YmxpYyBzdGF0aWMgcHV0KCBwdzogSVBhc3N3b3JkQW5kSGludCwgZmlsZSA6IFRGaWxlICk6IHZvaWQge1xyXG5cdFx0Y29uc29sZS5kZWJ1ZygnU2Vzc2lvblBhc3N3b3JkU2VydmljZS5wdXQnLCB7cHcsIGZpbGV9KVxyXG5cdFx0Y29uc29sZS5kZWJ1ZyggZmlsZS5wYXJlbnQucGF0aCApO1xyXG5cclxuXHRcdHRoaXMuY2FjaGUucHV0KGZpbGUucGF0aCwgcHcpO1xyXG5cdFx0dGhpcy5jYWNoZS5wdXQoZmlsZS5wYXJlbnQucGF0aCwgcHcpXHJcblx0XHR0aGlzLmNhY2hlLnB1dChmaWxlLmJhc2VuYW1lLCBwdyk7XHJcblxyXG5cdFx0U2Vzc2lvblBhc3N3b3JkU2VydmljZS51cGRhdGVFeHBpcnlUaW1lKCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGdldEV4YWN0KCBmaWxlIDogVEZpbGUgKTogSVBhc3N3b3JkQW5kSGludCB7XHJcblx0XHR0aGlzLmNsZWFySWZFeHBpcmVkKCk7XHJcblx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLnVwZGF0ZUV4cGlyeVRpbWUoKTtcclxuXHRcdHJldHVybiB0aGlzLmNhY2hlLmdldChmaWxlLnBhdGgsIFNlc3Npb25QYXNzd29yZFNlcnZpY2UuYmxhbmtQYXNzd29yZEFuZEhpbnQpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyBnZXRCZXN0R3Vlc3MoIGZpbGUgOiBURmlsZSApOiBJUGFzc3dvcmRBbmRIaW50IHtcclxuXHRcdHRoaXMuY2xlYXJJZkV4cGlyZWQoKTtcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygnU2Vzc2lvblBhc3N3b3JkU2VydmljZS5nZXRCZXN0R3Vlc3MnLCB7ZmlsZX0pXHJcblx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLnVwZGF0ZUV4cGlyeVRpbWUoKTtcclxuXHRcdFxyXG5cdFx0Y29uc3QgYnVlc3RHdWVzcyA9IHRoaXMuY2FjaGUuZ2V0Rmlyc3QoXHJcblx0XHRcdFtcclxuXHRcdFx0XHRmaWxlLnBhdGgsXHJcblx0XHRcdFx0ZmlsZS5wYXJlbnQucGF0aCxcclxuXHRcdFx0XHRmaWxlLmJhc2VuYW1lXHJcblx0XHRcdF0sXHJcblx0XHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UuYmxhbmtQYXNzd29yZEFuZEhpbnRcclxuXHRcdCk7XHJcblx0XHRjb25zb2xlLmRlYnVnKCdTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLmdldEJlc3RHdWVzcycsIHtmaWxlLCBidWVzdEd1ZXNzfSlcclxuXHJcblx0XHRyZXR1cm4gYnVlc3RHdWVzcztcclxuXHRcdFxyXG5cdFx0XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBjbGVhcklmRXhwaXJlZCgpIDogdm9pZHtcclxuXHRcdGlmICggU2Vzc2lvblBhc3N3b3JkU2VydmljZS5leHBpcnlUaW1lID09IG51bGwgKXtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCBEYXRlLm5vdygpIDwgU2Vzc2lvblBhc3N3b3JkU2VydmljZS5leHBpcnlUaW1lICl7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuY2xlYXIoKTtcclxuXHR9XHJcblxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGNsZWFyKCk6IHZvaWR7XHJcblx0XHR0aGlzLmNhY2hlLmNsZWFyKCk7XHJcblx0fVxyXG5cclxufVxyXG5cclxuIiwiaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IElNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmUgfSBmcm9tIFwic3JjL2ZlYXR1cmVzL0lNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmVcIjtcclxuaW1wb3J0IHsgU2Vzc2lvblBhc3N3b3JkU2VydmljZSB9IGZyb20gXCJzcmMvc2VydmljZXMvU2Vzc2lvblBhc3N3b3JkU2VydmljZVwiO1xyXG5pbXBvcnQgTWVsZEVuY3J5cHQgZnJvbSBcIi4uL21haW5cIjtcclxuaW1wb3J0IHsgSU1lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3MgfSBmcm9tIFwiLi9NZWxkRW5jcnlwdFBsdWdpblNldHRpbmdzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZWxkRW5jcnlwdFNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcblx0cGx1Z2luOiBNZWxkRW5jcnlwdDtcclxuXHRzZXR0aW5nczogSU1lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3M7XHJcblxyXG5cdGZlYXR1cmVzOklNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmVbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogTWVsZEVuY3J5cHQsXHJcblx0XHRzZXR0aW5nczpJTWVsZEVuY3J5cHRQbHVnaW5TZXR0aW5ncyxcclxuXHRcdGZlYXR1cmVzOiBJTWVsZEVuY3J5cHRQbHVnaW5GZWF0dXJlW11cclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG5cdFx0dGhpcy5mZWF0dXJlcyA9IGZlYXR1cmVzO1xyXG5cdH1cclxuXHJcblx0ZGlzcGxheSgpOiB2b2lkIHtcclxuXHRcdGxldCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xyXG5cclxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRcclxuXHRcdGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMScsIHt0ZXh0OiAnU2V0dGluZ3MgZm9yIE1lbGQgRW5jcnlwdCd9KTtcclxuXHJcblx0XHQvLyBidWlsZCBjb21tb24gc2V0dGluZ3NcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpXHJcblx0XHRcdC5zZXROYW1lKCdDb21tb24gU2V0dGluZ3MnKVxyXG5cdFx0O1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSgnQ29uZmlybSBwYXNzd29yZD8nKVxyXG5cdFx0XHQuc2V0RGVzYygnQ29uZmlybSBwYXNzd29yZCB3aGVuIGVuY3J5cHRpbmcuJylcclxuXHRcdFx0LmFkZFRvZ2dsZSggdG9nZ2xlID0+e1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc2V0dGluZ3MuY29uZmlybVBhc3N3b3JkKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCBhc3luYyB2YWx1ZSA9PntcclxuXHRcdFx0XHRcdFx0dGhpcy5zZXR0aW5ncy5jb25maXJtUGFzc3dvcmQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHR9KVxyXG5cdFx0O1xyXG5cclxuXHRcdGNvbnN0IHVwZGF0ZVJlbWVtYmVyUGFzc3dvcmRTZXR0aW5nc1VpID0gKCkgPT4ge1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCAhdGhpcy5zZXR0aW5ncy5yZW1lbWJlclBhc3N3b3JkICl7XHJcblx0XHRcdFx0cHdUaW1lb3V0U2V0dGluZy5zZXR0aW5nRWwuaGlkZSgpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0cHdUaW1lb3V0U2V0dGluZy5zZXR0aW5nRWwuc2hvdygpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVtZW1iZXJQYXNzd29yZFRpbWVvdXQgPSB0aGlzLnNldHRpbmdzLnJlbWVtYmVyUGFzc3dvcmRUaW1lb3V0O1xyXG5cclxuXHRcdFx0bGV0IHRpbWVvdXRTdHJpbmcgPSBgJHtyZW1lbWJlclBhc3N3b3JkVGltZW91dH0gbWludXRlc2A7XHJcblx0XHRcdGlmKCByZW1lbWJlclBhc3N3b3JkVGltZW91dCA9PSAwICl7XHJcblx0XHRcdFx0dGltZW91dFN0cmluZyA9ICdOZXZlciBmb3JnZXQnO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwd1RpbWVvdXRTZXR0aW5nLnNldE5hbWUoIGBSZW1lbWJlciBQYXNzd29yZCBUaW1lb3V0ICgke3RpbWVvdXRTdHJpbmd9KWAgKVxyXG5cdFx0XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKCdSZW1lbWJlciBwYXNzd29yZD8nKVxyXG5cdFx0XHQuc2V0RGVzYygnUmVtZW1iZXIgdGhlIGxhc3QgdXNlZCBwYXNzd29yZHMgd2hlbiBlbmNyeXB0aW5nIG9yIGRlY3J5cHRpbmcuJylcclxuXHRcdFx0LmFkZFRvZ2dsZSggdG9nZ2xlID0+e1xyXG5cdFx0XHRcdHRvZ2dsZVxyXG5cdFx0XHRcdFx0LnNldFZhbHVlKHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQYXNzd29yZClcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSggYXN5bmMgdmFsdWUgPT57XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQYXNzd29yZCA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0U2Vzc2lvblBhc3N3b3JkU2VydmljZS5zZXRBY3RpdmUoIHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQYXNzd29yZCApO1xyXG5cdFx0XHRcdFx0XHR1cGRhdGVSZW1lbWJlclBhc3N3b3JkU2V0dGluZ3NVaSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0fSlcclxuXHRcdDtcclxuXHJcblx0XHRjb25zdCBwd1RpbWVvdXRTZXR0aW5nID0gbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXREZXNjKCdUaGUgbnVtYmVyIG9mIG1pbnV0ZXMgdG8gcmVtZW1iZXIgcGFzc3dvcmRzLicpXHJcblx0XHRcdC5hZGRTbGlkZXIoIHNsaWRlciA9PiB7XHJcblx0XHRcdFx0c2xpZGVyXHJcblx0XHRcdFx0XHQuc2V0TGltaXRzKDAsIDEyMCwgNSlcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLnNldHRpbmdzLnJlbWVtYmVyUGFzc3dvcmRUaW1lb3V0KVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCBhc3luYyB2YWx1ZSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQYXNzd29yZFRpbWVvdXQgPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2Uuc2V0QXV0b0V4cGlyZSggdGhpcy5zZXR0aW5ncy5yZW1lbWJlclBhc3N3b3JkVGltZW91dCApO1xyXG5cdFx0XHRcdFx0XHR1cGRhdGVSZW1lbWJlclBhc3N3b3JkU2V0dGluZ3NVaSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQ7XHJcblx0XHRcdFx0XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0XHRcclxuXHRcdHVwZGF0ZVJlbWVtYmVyUGFzc3dvcmRTZXR0aW5nc1VpKCk7XHJcblxyXG5cdFx0Ly8gYnVpbGQgZmVhdHVyZSBzZXR0aW5nc1xyXG5cdFx0dGhpcy5mZWF0dXJlcy5mb3JFYWNoKGYgPT4ge1xyXG5cdFx0XHRmLmJ1aWxkU2V0dGluZ3NVaSggY29udGFpbmVyRWwsIGFzeW5jICgpID0+IGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpICk7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdH1cclxuXHJcbn0iLCJjb25zdCB2ZWN0b3JTaXplXHQ9IDE2O1xyXG5jb25zdCB1dGY4RW5jb2Rlclx0PSBuZXcgVGV4dEVuY29kZXIoKTtcclxuY29uc3QgdXRmOERlY29kZXJcdD0gbmV3IFRleHREZWNvZGVyKCk7XHJcbmNvbnN0IGl0ZXJhdGlvbnNcdD0gMTAwMDtcclxuY29uc3Qgc2FsdFx0XHRcdD0gdXRmOEVuY29kZXIuZW5jb2RlKCdYSFduREFUNmVoTVZZMnpEJyk7XHJcblxyXG5leHBvcnQgY2xhc3MgQ3J5cHRvSGVscGVyIHtcclxuXHJcblx0cHJpdmF0ZSBhc3luYyBkZXJpdmVLZXkocGFzc3dvcmQ6c3RyaW5nKSA6UHJvbWlzZTxDcnlwdG9LZXk+IHtcclxuXHRcdGNvbnN0IGJ1ZmZlciAgICAgPSB1dGY4RW5jb2Rlci5lbmNvZGUocGFzc3dvcmQpO1xyXG5cdFx0Y29uc3Qga2V5ICAgICAgICA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KCdyYXcnLCBidWZmZXIsIHtuYW1lOiAnUEJLREYyJ30sIGZhbHNlLCBbJ2Rlcml2ZUtleSddKTtcclxuXHRcdGNvbnN0IHByaXZhdGVLZXkgPSBjcnlwdG8uc3VidGxlLmRlcml2ZUtleShcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6ICdQQktERjInLFxyXG5cdFx0XHRcdGhhc2g6IHtuYW1lOiAnU0hBLTI1Nid9LFxyXG5cdFx0XHRcdGl0ZXJhdGlvbnMsXHJcblx0XHRcdFx0c2FsdFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRrZXksXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiAnQUVTLUdDTScsXHJcblx0XHRcdFx0bGVuZ3RoOiAyNTZcclxuXHRcdFx0fSxcclxuXHRcdFx0ZmFsc2UsXHJcblx0XHRcdFsnZW5jcnlwdCcsICdkZWNyeXB0J11cclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdHJldHVybiBwcml2YXRlS2V5O1xyXG5cdH1cclxuXHJcblx0cHVibGljIGFzeW5jIGVuY3J5cHRUb0J5dGVzKHRleHQ6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8VWludDhBcnJheT4ge1xyXG5cclxuXHRcdGNvbnN0IGtleSA9IGF3YWl0IHRoaXMuZGVyaXZlS2V5KHBhc3N3b3JkKTtcclxuXHRcdFxyXG5cdFx0Y29uc3QgdGV4dEJ5dGVzVG9FbmNyeXB0ID0gdXRmOEVuY29kZXIuZW5jb2RlKHRleHQpO1xyXG5cdFx0Y29uc3QgdmVjdG9yID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSh2ZWN0b3JTaXplKSk7XHJcblx0XHRcclxuXHRcdC8vIGVuY3J5cHQgaW50byBieXRlc1xyXG5cdFx0Y29uc3QgZW5jcnlwdGVkQnl0ZXMgPSBuZXcgVWludDhBcnJheShcclxuXHRcdFx0YXdhaXQgY3J5cHRvLnN1YnRsZS5lbmNyeXB0KFxyXG5cdFx0XHRcdHtuYW1lOiAnQUVTLUdDTScsIGl2OiB2ZWN0b3J9LFxyXG5cdFx0XHRcdGtleSxcclxuXHRcdFx0XHR0ZXh0Qnl0ZXNUb0VuY3J5cHRcclxuXHRcdFx0KVxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0Y29uc3QgZmluYWxCeXRlcyA9IG5ldyBVaW50OEFycmF5KCB2ZWN0b3IuYnl0ZUxlbmd0aCArIGVuY3J5cHRlZEJ5dGVzLmJ5dGVMZW5ndGggKTtcclxuXHRcdGZpbmFsQnl0ZXMuc2V0KCB2ZWN0b3IsIDAgKTtcclxuXHRcdGZpbmFsQnl0ZXMuc2V0KCBlbmNyeXB0ZWRCeXRlcywgdmVjdG9yLmJ5dGVMZW5ndGggKTtcclxuXHJcblx0XHRyZXR1cm4gZmluYWxCeXRlcztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY29udmVydFRvU3RyaW5nKCBieXRlcyA6IFVpbnQ4QXJyYXkgKTogc3RyaW5nIHtcclxuXHRcdGxldCByZXN1bHQgPSAnJztcclxuXHRcdGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGJ5dGVzLmxlbmd0aDsgaWR4KyspIHtcclxuXHRcdFx0Ly8gYXBwZW5kIHRvIHJlc3VsdFxyXG5cdFx0XHRyZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpZHhdKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgZW5jcnlwdFRvQmFzZTY0KHRleHQ6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcblxyXG5cdFx0Y29uc3QgZmluYWxCeXRlcyA9IGF3YWl0IHRoaXMuZW5jcnlwdFRvQnl0ZXModGV4dCwgcGFzc3dvcmQpO1xyXG5cclxuXHRcdC8vY29udmVydCBhcnJheSB0byBiYXNlNjRcclxuXHRcdGNvbnN0IGJhc2U2NFRleHQgPSBidG9hKCB0aGlzLmNvbnZlcnRUb1N0cmluZyhmaW5hbEJ5dGVzKSApO1xyXG5cclxuXHRcdHJldHVybiBiYXNlNjRUZXh0O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzdHJpbmdUb0FycmF5KHN0cjogc3RyaW5nKTogVWludDhBcnJheSB7XHJcblx0XHR2YXIgcmVzdWx0ID0gW107XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRyZXN1bHQucHVzaChzdHIuY2hhckNvZGVBdChpKSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkocmVzdWx0KTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhc3luYyBkZWNyeXB0RnJvbUJ5dGVzKGVuY3J5cHRlZEJ5dGVzOiBVaW50OEFycmF5LCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdHRyeSB7XHJcblxyXG5cdFx0XHQvLyBleHRyYWN0IGl2XHJcblx0XHRcdGNvbnN0IHZlY3RvciA9IGVuY3J5cHRlZEJ5dGVzLnNsaWNlKDAsdmVjdG9yU2l6ZSk7XHJcblxyXG5cdFx0XHQvLyBleHRyYWN0IGVuY3J5cHRlZCB0ZXh0XHJcblx0XHRcdGNvbnN0IGVuY3J5cHRlZFRleHRCeXRlcyA9IGVuY3J5cHRlZEJ5dGVzLnNsaWNlKHZlY3RvclNpemUpO1xyXG5cclxuXHRcdFx0Y29uc3Qga2V5ID0gYXdhaXQgdGhpcy5kZXJpdmVLZXkocGFzc3dvcmQpO1xyXG5cclxuXHRcdFx0Ly8gZGVjcnlwdCBpbnRvIGJ5dGVzXHJcblx0XHRcdGxldCBkZWNyeXB0ZWRCeXRlcyA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGVjcnlwdChcclxuXHRcdFx0XHR7bmFtZTogJ0FFUy1HQ00nLCBpdjogdmVjdG9yfSxcclxuXHRcdFx0XHRrZXksXHJcblx0XHRcdFx0ZW5jcnlwdGVkVGV4dEJ5dGVzXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBjb252ZXJ0IGJ5dGVzIHRvIHRleHRcclxuXHRcdFx0bGV0IGRlY3J5cHRlZFRleHQgPSB1dGY4RGVjb2Rlci5kZWNvZGUoZGVjcnlwdGVkQnl0ZXMpO1xyXG5cdFx0XHRyZXR1cm4gZGVjcnlwdGVkVGV4dDtcclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Ly9jb25zb2xlLmVycm9yKGUpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhc3luYyBkZWNyeXB0RnJvbUJhc2U2NChiYXNlNjRFbmNvZGVkOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0dHJ5IHtcclxuXHJcblx0XHRcdGxldCBieXRlc1RvRGVjb2RlID0gdGhpcy5zdHJpbmdUb0FycmF5KGF0b2IoYmFzZTY0RW5jb2RlZCkpO1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZGVjcnlwdEZyb21CeXRlcyhieXRlc1RvRGVjb2RlLCBwYXNzd29yZCk7XHJcblxyXG5cdFx0XHQvLyAvLyBleHRyYWN0IGl2XHJcblx0XHRcdC8vIGNvbnN0IHZlY3RvciA9IGJ5dGVzVG9EZWNvZGUuc2xpY2UoMCx2ZWN0b3JTaXplKTtcclxuXHJcblx0XHRcdC8vIC8vIGV4dHJhY3QgZW5jcnlwdGVkIHRleHRcclxuXHRcdFx0Ly8gY29uc3QgZW5jcnlwdGVkVGV4dEJ5dGVzID0gYnl0ZXNUb0RlY29kZS5zbGljZSh2ZWN0b3JTaXplKTtcclxuXHJcblx0XHRcdC8vIGNvbnN0IGtleSA9IGF3YWl0IHRoaXMuZGVyaXZlS2V5KHBhc3N3b3JkKTtcclxuXHJcblx0XHRcdC8vIC8vIGRlY3J5cHQgaW50byBieXRlc1xyXG5cdFx0XHQvLyBsZXQgZGVjcnlwdGVkQnl0ZXMgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRlY3J5cHQoXHJcblx0XHRcdC8vIFx0e25hbWU6ICdBRVMtR0NNJywgaXY6IHZlY3Rvcn0sXHJcblx0XHRcdC8vIFx0a2V5LFxyXG5cdFx0XHQvLyBcdGVuY3J5cHRlZFRleHRCeXRlc1xyXG5cdFx0XHQvLyApO1xyXG5cclxuXHRcdFx0Ly8gLy8gY29udmVydCBieXRlcyB0byB0ZXh0XHJcblx0XHRcdC8vIGxldCBkZWNyeXB0ZWRUZXh0ID0gdXRmOERlY29kZXIuZGVjb2RlKGRlY3J5cHRlZEJ5dGVzKTtcclxuXHRcdFx0Ly8gcmV0dXJuIGRlY3J5cHRlZFRleHQ7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdC8vY29uc29sZS5lcnJvcihlKTtcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuXHJcblxyXG4iLCJleHBvcnQgY29uc3QgYWxnb3JpdGhtT2Jzb2xldGUgPSB7XHJcblx0bmFtZTogJ0FFUy1HQ00nLFxyXG5cdGl2OiBuZXcgVWludDhBcnJheShbMTk2LCAxOTAsIDI0MCwgMTkwLCAxODgsIDc4LCA0MSwgMTMyLCAxNSwgMjIwLCA4NCwgMjExXSksXHJcblx0dGFnTGVuZ3RoOiAxMjhcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENyeXB0b0hlbHBlck9ic29sZXRlIHtcclxuXHJcblx0cHJpdmF0ZSBhc3luYyBidWlsZEtleShwYXNzd29yZDogc3RyaW5nKSB7XHJcblx0XHRsZXQgdXRmOEVuY29kZSA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG5cdFx0bGV0IHBhc3N3b3JkQnl0ZXMgPSB1dGY4RW5jb2RlLmVuY29kZShwYXNzd29yZCk7XHJcblxyXG5cdFx0bGV0IHBhc3N3b3JkRGlnZXN0ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoeyBuYW1lOiAnU0hBLTI1NicgfSwgcGFzc3dvcmRCeXRlcyk7XHJcblxyXG5cdFx0bGV0IGtleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFxyXG5cdFx0XHQncmF3JyxcclxuXHRcdFx0cGFzc3dvcmREaWdlc3QsXHJcblx0XHRcdGFsZ29yaXRobU9ic29sZXRlLFxyXG5cdFx0XHRmYWxzZSxcclxuXHRcdFx0WydlbmNyeXB0JywgJ2RlY3J5cHQnXVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4ga2V5O1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuICBcdCogQGRlcHJlY2F0ZWRcclxuIFx0Ki9cclxuXHRwdWJsaWMgYXN5bmMgZW5jcnlwdFRvQmFzZTY0KHRleHQ6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRsZXQga2V5ID0gYXdhaXQgdGhpcy5idWlsZEtleShwYXNzd29yZCk7XHJcblxyXG5cdFx0bGV0IHV0ZjhFbmNvZGUgPSBuZXcgVGV4dEVuY29kZXIoKTtcclxuXHRcdGxldCBieXRlc1RvRW5jcnlwdCA9IHV0ZjhFbmNvZGUuZW5jb2RlKHRleHQpO1xyXG5cclxuXHRcdC8vIGVuY3J5cHQgaW50byBieXRlc1xyXG5cdFx0bGV0IGVuY3J5cHRlZEJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgY3J5cHRvLnN1YnRsZS5lbmNyeXB0KFxyXG5cdFx0XHRhbGdvcml0aG1PYnNvbGV0ZSwga2V5LCBieXRlc1RvRW5jcnlwdFxyXG5cdFx0KSk7XHJcblxyXG5cdFx0Ly9jb252ZXJ0IGFycmF5IHRvIGJhc2U2NFxyXG5cdFx0bGV0IGJhc2U2NFRleHQgPSBidG9hKFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uZW5jcnlwdGVkQnl0ZXMpKTtcclxuXHJcblx0XHRyZXR1cm4gYmFzZTY0VGV4dDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc3RyaW5nVG9BcnJheShzdHI6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xyXG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0cmVzdWx0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG5ldyBVaW50OEFycmF5KHJlc3VsdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgZGVjcnlwdEZyb21CYXNlNjQoYmFzZTY0RW5jb2RlZDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIGNvbnZlcnQgYmFzZSA2NCB0byBhcnJheVxyXG5cdFx0XHRsZXQgYnl0ZXNUb0RlY3J5cHQgPSB0aGlzLnN0cmluZ1RvQXJyYXkoYXRvYihiYXNlNjRFbmNvZGVkKSk7XHJcblxyXG5cdFx0XHRsZXQga2V5ID0gYXdhaXQgdGhpcy5idWlsZEtleShwYXNzd29yZCk7XHJcblxyXG5cdFx0XHQvLyBkZWNyeXB0IGludG8gYnl0ZXNcclxuXHRcdFx0bGV0IGRlY3J5cHRlZEJ5dGVzID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kZWNyeXB0KGFsZ29yaXRobU9ic29sZXRlLCBrZXksIGJ5dGVzVG9EZWNyeXB0KTtcclxuXHJcblx0XHRcdC8vIGNvbnZlcnQgYnl0ZXMgdG8gdGV4dFxyXG5cdFx0XHRsZXQgdXRmOERlY29kZSA9IG5ldyBUZXh0RGVjb2RlcigpO1xyXG5cdFx0XHRsZXQgZGVjcnlwdGVkVGV4dCA9IHV0ZjhEZWNvZGUuZGVjb2RlKGRlY3J5cHRlZEJ5dGVzKTtcclxuXHRcdFx0cmV0dXJuIGRlY3J5cHRlZFRleHQ7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn1cclxuIiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBTZXR0aW5nLCBUZXh0QXJlYUNvbXBvbmVudCB9IGZyb20gJ29ic2lkaWFuJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERlY3J5cHRNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHR0ZXh0OiBzdHJpbmc7XHJcblx0ZGVjcnlwdEluUGxhY2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRzaG93Q29weUJ1dHRvbjogYm9vbGVhblxyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0dGl0bGU6IHN0cmluZyxcclxuXHRcdHRleHQ6IHN0cmluZyA9ICcnLFxyXG5cdFx0c2hvd0NvcHlCdXR0b246Ym9vbGVhblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMudGl0bGVFbC5zZXRUZXh0KHRpdGxlKTtcclxuXHRcdHRoaXMudGV4dCA9IHRleHQ7XHJcblx0XHR0aGlzLnNob3dDb3B5QnV0dG9uID0gc2hvd0NvcHlCdXR0b247XHJcblx0fVxyXG5cclxuXHRvbk9wZW4oKSB7XHJcblx0XHRsZXQgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblxyXG5cdFx0bGV0IGNUZXh0QXJlYSA6IFRleHRBcmVhQ29tcG9uZW50O1xyXG5cdFx0Y29uc3Qgc1RleHQgPSBuZXcgU2V0dGluZyhjb250ZW50RWwpXHJcblx0XHRcdC5hZGRUZXh0QXJlYSggY2I9PntcclxuXHRcdFx0XHRjVGV4dEFyZWEgPSBjYjtcclxuXHRcdFx0XHRjYi5zZXRWYWx1ZSh0aGlzLnRleHQpO1xyXG5cdFx0XHRcdGNiLmlucHV0RWwuc2V0U2VsZWN0aW9uUmFuZ2UoMCwwKVxyXG5cdFx0XHRcdGNiLmlucHV0RWwucmVhZE9ubHkgPSB0cnVlO1xyXG5cdFx0XHRcdGNiLmlucHV0RWwucm93cyA9IDEwO1xyXG5cdFx0XHRcdGNiLmlucHV0RWwuc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcblx0XHRcdFx0Y2IuaW5wdXRFbC5zdHlsZS5taW5IZWlnaHQgPSAnM2VtJztcclxuXHRcdFx0XHRjYi5pbnB1dEVsLnN0eWxlLnJlc2l6ZSA9ICd2ZXJ0aWNhbCc7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0XHRzVGV4dC5zZXR0aW5nRWwucXVlcnlTZWxlY3RvcignLnNldHRpbmctaXRlbS1pbmZvJykucmVtb3ZlKCk7XHJcblxyXG5cdFx0Y29uc3Qgc0FjdGlvbnMgPVx0bmV3IFNldHRpbmcoY29udGVudEVsKTtcclxuXHJcblx0XHRpZiAodGhpcy5zaG93Q29weUJ1dHRvbil7XHJcblxyXG5cdFx0XHRzQWN0aW9uc1xyXG5cdFx0XHRcdC5hZGRCdXR0b24oIGNiID0+e1xyXG5cdFx0XHRcdFx0Y2JcclxuXHRcdFx0XHRcdFx0LnNldEJ1dHRvblRleHQoJ0NvcHknKVxyXG5cdFx0XHRcdFx0XHQub25DbGljayggZXZ0ID0+e1xyXG5cdFx0XHRcdFx0XHRcdG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KCBjVGV4dEFyZWEuZ2V0VmFsdWUoKSApO1xyXG5cdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoJ0NvcGllZCEnKTtcclxuXHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdDtcclxuXHRcdFx0XHRcdGlmICghdGhpcy5zaG93Q29weUJ1dHRvbil7XHJcblxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdDtcclxuXHRcdH1cclxuXHJcblx0XHRzQWN0aW9uc1xyXG5cdFx0XHQuYWRkQnV0dG9uKCBjYiA9PntcclxuXHRcdFx0XHRjYlxyXG5cdFx0XHRcdFx0LnNldFdhcm5pbmcoKVxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQoJ0RlY3J5cHQgaW4tcGxhY2UnKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soIGV2dCA9PntcclxuXHRcdFx0XHRcdFx0dGhpcy5kZWNyeXB0SW5QbGFjZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0O1xyXG5cdFx0XHR9KVxyXG5cdFx0O1xyXG5cclxuXHR9XHJcblxyXG59IiwiaW1wb3J0IHsgU2V0dGluZywgVGV4dENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbnRlcmZhY2UgSUJ1aWxkUGFzc3dvcmRTZXR0aW5nUGFyYW1zIHtcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblx0bmFtZTogc3RyaW5nO1xyXG5cdGRlc2M/OiBzdHJpbmc7XHJcblx0YXV0b0ZvY3VzPzogYm9vbGVhbjtcclxuXHRwbGFjZWhvbGRlcj86IHN0cmluZztcclxuXHRpbml0aWFsVmFsdWU/OnN0cmluZztcclxuXHRvbkNoYW5nZUNhbGxiYWNrPzogKHZhbHVlOnN0cmluZykgPT4gYW55O1xyXG5cdG9uRW50ZXJDYWxsYmFjaz86ICh2YWx1ZTpzdHJpbmcpID0+IGFueTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFVpSGVscGVye1xyXG5cclxuXHQvKipcclxuXHRcdENoZWNrIGlmIHRoZSBTZXR0aW5ncyBtb2RhbCBpcyBvcGVuXHJcblx0Ki9cclxuXHRwdWJsaWMgc3RhdGljIGlzU2V0dGluZ3NNb2RhbE9wZW4oKSA6IGJvb2xlYW57XHJcblx0XHRyZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZC1zZXR0aW5ncycpICE9PSBudWxsO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHN0YXRpYyBidWlsZFBhc3N3b3JkU2V0dGluZyhcclxuXHRcdHtcclxuXHRcdFx0Y29udGFpbmVyLFxyXG5cdFx0XHRuYW1lLFxyXG5cdFx0XHRkZXNjID0gJycsXHJcblx0XHRcdGF1dG9Gb2N1cyA9IGZhbHNlLFxyXG5cdFx0XHRwbGFjZWhvbGRlciA9ICcnLFxyXG5cdFx0XHRpbml0aWFsVmFsdWUgPSAnJyxcclxuXHRcdFx0b25DaGFuZ2VDYWxsYmFjayxcclxuXHRcdFx0b25FbnRlckNhbGxiYWNrLFxyXG5cdFx0fTogSUJ1aWxkUGFzc3dvcmRTZXR0aW5nUGFyYW1zXHJcblx0KSA6IFNldHRpbmcge1xyXG5cdFx0Y29uc3Qgc0NvbnRyb2wgPSBuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKG5hbWUpXHJcblx0XHRcdC5zZXREZXNjKGRlc2MpXHJcblx0XHRcdC5hZGRCdXR0b24oIGNiPT57XHJcblx0XHRcdFx0Y2JcclxuXHRcdFx0XHRcdC5zZXRJY29uKCAncmVhZGluZy1nbGFzc2VzJyApXHJcblx0XHRcdFx0XHQub25DbGljayggZXZ0ID0+e1xyXG5cdFx0XHRcdFx0XHQvLyB0b2dnbGUgdmlldyBwYXNzd29yZFxyXG5cdFx0XHRcdFx0XHRjb25zdCBpbnB1dEN0cmwgPSBzQ29udHJvbC5jb21wb25lbnRzLmZpbmQoIChiYywgaWR4LCBvYmopPT5iYyBpbnN0YW5jZW9mIFRleHRDb21wb25lbnQgKTtcclxuXHRcdFx0XHRcdFx0aWYgKGlucHV0Q3RybCBpbnN0YW5jZW9mIFRleHRDb21wb25lbnQpe1xyXG5cdFx0XHRcdFx0XHRcdGlucHV0Q3RybC5pbnB1dEVsLnR5cGUgPSBpbnB1dEN0cmwuaW5wdXRFbC50eXBlID09ICdwYXNzd29yZCcgPyAndGV4dCcgOiAncGFzc3dvcmQnO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdDtcclxuXHRcdFx0fSlcclxuXHRcdFx0LmFkZFRleHQoIHRjID0+IHtcclxuXHRcdFx0XHR0Yy5zZXRQbGFjZWhvbGRlcihwbGFjZWhvbGRlcik7XHJcblx0XHRcdFx0dGMuc2V0VmFsdWUoaW5pdGlhbFZhbHVlKTtcclxuXHRcdFx0XHR0Yy5pbnB1dEVsLnR5cGUgPSAncGFzc3dvcmQnO1xyXG5cdFx0XHRcdGlmIChvbkNoYW5nZUNhbGxiYWNrIT1udWxsKXtcclxuXHRcdFx0XHRcdHRjLm9uQ2hhbmdlKCBvbkNoYW5nZUNhbGxiYWNrICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChvbkVudGVyQ2FsbGJhY2shPW51bGwpe1xyXG5cdFx0XHRcdFx0dGMuaW5wdXRFbC5vbmtleWRvd24gPSAoZXYpPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoIGV2LmtleSA9PT0gJ0VudGVyJyApIHtcclxuXHRcdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHRcdG9uRW50ZXJDYWxsYmFjayggdGMuZ2V0VmFsdWUoKSApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChhdXRvRm9jdXMpe1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB0Yy5pbnB1dEVsLmZvY3VzKCksIDApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSApXHJcblx0XHQ7XHJcblxyXG5cdFx0cmV0dXJuIHNDb250cm9sO1xyXG5cdH1cclxuXHJcblxyXG59IiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZywgVGV4dENvbXBvbmVudCB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IHsgVWlIZWxwZXIgfSBmcm9tICdzcmMvc2VydmljZXMvVWlIZWxwZXInO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFzc3dvcmRNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRcclxuXHQvLyBpbnB1dFxyXG5cdHByaXZhdGUgZGVmYXVsdFBhc3N3b3JkPzogc3RyaW5nID0gbnVsbDtcclxuXHRwcml2YXRlIGRlZmF1bHRIaW50Pzogc3RyaW5nID0gbnVsbDtcclxuXHRwcml2YXRlIGNvbmZpcm1QYXNzd29yZDogYm9vbGVhbjtcclxuXHRwcml2YXRlIGlzRW5jcnlwdGluZzogYm9vbGVhbjtcclxuXHRcclxuXHQvLyBvdXRwdXRcclxuXHRwdWJsaWMgcmVzdWx0Q29uZmlybWVkOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHVibGljIHJlc3VsdFBhc3N3b3JkPzogc3RyaW5nID0gbnVsbDtcclxuXHRwdWJsaWMgcmVzdWx0SGludD86IHN0cmluZyA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRpc0VuY3J5cHRpbmc6Ym9vbGVhbixcclxuXHRcdGNvbmZpcm1QYXNzd29yZDogYm9vbGVhbixcclxuXHRcdGRlZmF1bHRQYXNzd29yZDogc3RyaW5nID0gbnVsbCxcclxuXHRcdGhpbnQ6c3RyaW5nID0gbnVsbFxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMuZGVmYXVsdFBhc3N3b3JkID0gZGVmYXVsdFBhc3N3b3JkO1xyXG5cdFx0dGhpcy5jb25maXJtUGFzc3dvcmQgPSBjb25maXJtUGFzc3dvcmQ7XHJcblx0XHR0aGlzLmlzRW5jcnlwdGluZyA9IGlzRW5jcnlwdGluZztcclxuXHRcdHRoaXMuZGVmYXVsdEhpbnQgPSBoaW50O1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0bGV0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cclxuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuXHRcdC8vdGhpcy5jb250ZW50RWwuc3R5bGUud2lkdGggPSAnYXV0byc7XHJcblx0XHR0aGlzLmludmFsaWRhdGUoKTtcclxuXHJcblx0XHRsZXQgcGFzc3dvcmQgPSB0aGlzLmRlZmF1bHRQYXNzd29yZCA/PyAnJztcclxuXHRcdGxldCBjb25maXJtUGFzcyA9ICcnO1xyXG5cdFx0bGV0IGhpbnQgPSB0aGlzLmRlZmF1bHRIaW50ID8/ICcnO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0SGVhZGluZygpLnNldE5hbWUoXHJcblx0XHRcdHRoaXMuaXNFbmNyeXB0aW5nID8gJ0VuY3J5cHRpbmcnIDogJ0RlY3J5cHRpbmcnXHJcblx0XHQpO1xyXG5cclxuXHRcdC8qIE1haW4gcGFzc3dvcmQgaW5wdXQqL1xyXG5cclxuXHRcdGNvbnN0IHNQYXNzd29yZCA9IFVpSGVscGVyLmJ1aWxkUGFzc3dvcmRTZXR0aW5nKHtcclxuXHRcdFx0Y29udGFpbmVyOiBjb250ZW50RWwsXHJcblx0XHRcdG5hbWU6ICdQYXNzd29yZDonLFxyXG5cdFx0XHRwbGFjZWhvbGRlcjogdGhpcy5pc0VuY3J5cHRpbmcgPyAnJyA6IGBIaW50OiAke3RoaXMuZGVmYXVsdEhpbnR9YCxcclxuXHRcdFx0aW5pdGlhbFZhbHVlOiBwYXNzd29yZCxcclxuXHRcdFx0YXV0b0ZvY3VzOiB0cnVlLFxyXG5cdFx0XHRvbkNoYW5nZUNhbGxiYWNrOiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRwYXNzd29yZCA9IHZhbHVlO1xyXG5cdFx0XHRcdHRoaXMuaW52YWxpZGF0ZSgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbkVudGVyQ2FsbGJhY2s6ICh2YWx1ZSkgPT57XHJcblx0XHRcdFx0cGFzc3dvcmQgPSB2YWx1ZTtcclxuXHRcdFx0XHR0aGlzLmludmFsaWRhdGUoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAocGFzc3dvcmQubGVuZ3RoID4gMCl7XHJcblx0XHRcdFx0XHRpZiAoc0NvbmZpcm1QYXNzd29yZC5zZXR0aW5nRWwuaXNTaG93bigpKXtcclxuXHRcdFx0XHRcdFx0Ly90Y0NvbmZpcm1QYXNzd29yZC5pbnB1dEVsLmZvY3VzKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGVsSW5wID0gc0NvbmZpcm1QYXNzd29yZC5jb21wb25lbnRzLmZpbmQoIChiYykgPT4gYmMgaW5zdGFuY2VvZiBUZXh0Q29tcG9uZW50ICk7XHJcblx0XHRcdFx0XHRcdGlmICggZWxJbnAgaW5zdGFuY2VvZiBUZXh0Q29tcG9uZW50ICl7XHJcblx0XHRcdFx0XHRcdFx0ZWxJbnAuaW5wdXRFbC5mb2N1cygpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0fWVsc2UgaWYgKHNIaW50LnNldHRpbmdFbC5pc1Nob3duKCkpe1xyXG5cdFx0XHRcdFx0XHQvL3RjSGludC5pbnB1dEVsLmZvY3VzKCk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGVsSW5wID0gc0hpbnQuY29tcG9uZW50cy5maW5kKCAoYmMpID0+IGJjIGluc3RhbmNlb2YgVGV4dENvbXBvbmVudCApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIGVsSW5wIGluc3RhbmNlb2YgVGV4dENvbXBvbmVudCApe1xyXG5cdFx0XHRcdFx0XHRcdGVsSW5wLmlucHV0RWwuZm9jdXMoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fWVsc2UgaWYoIHZhbGlkYXRlKCkgKXtcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8qIEVuZCBNYWluIHBhc3N3b3JkIGlucHV0IHJvdyAqL1xyXG5cclxuXHRcdC8qIENvbmZpcm0gcGFzc3dvcmQgaW5wdXQgcm93ICovXHJcblx0XHRjb25zdCBzQ29uZmlybVBhc3N3b3JkID0gVWlIZWxwZXIuYnVpbGRQYXNzd29yZFNldHRpbmcoe1xyXG5cdFx0XHRjb250YWluZXIgOiBjb250ZW50RWwsXHJcblx0XHRcdG5hbWU6ICdDb25maXJtIFBhc3N3b3JkOicsXHJcblx0XHRcdG9uQ2hhbmdlQ2FsbGJhY2s6ICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdGNvbmZpcm1QYXNzID0gdmFsdWU7XHJcblx0XHRcdFx0dGhpcy5pbnZhbGlkYXRlKCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uRW50ZXJDYWxsYmFjazogKHZhbHVlKSA9PntcclxuXHRcdFx0XHRjb25maXJtUGFzcyA9IHZhbHVlO1xyXG5cdFx0XHRcdHRoaXMuaW52YWxpZGF0ZSgpO1xyXG5cdFx0XHRcdGlmIChjb25maXJtUGFzcy5sZW5ndGggPiAwKXtcclxuXHRcdFx0XHRcdGlmICggdmFsaWRhdGUoKSApe1xyXG5cdFx0XHRcdFx0XHRpZiAoIHNIaW50LnNldHRpbmdFbC5pc1Nob3duKCkgKXtcclxuXHRcdFx0XHRcdFx0XHQvL3RjSGludC5pbnB1dEVsLmZvY3VzKCk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZWxJbnAgPSBzSGludC5jb21wb25lbnRzLmZpbmQoIChiYykgPT4gYmMgaW5zdGFuY2VvZiBUZXh0Q29tcG9uZW50ICk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBlbElucCBpbnN0YW5jZW9mIFRleHRDb21wb25lbnQgKXtcclxuXHRcdFx0XHRcdFx0XHRcdGVsSW5wLmlucHV0RWwuZm9jdXMoKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICggIXRoaXMuY29uZmlybVBhc3N3b3JkICl7XHJcblx0XHRcdHNDb25maXJtUGFzc3dvcmQuc2V0dGluZ0VsLmhpZGUoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0LyogRW5kIENvbmZpcm0gcGFzc3dvcmQgaW5wdXQgcm93ICovXHJcblxyXG5cdFx0LyogSGludCBpbnB1dCByb3cgKi9cclxuXHRcdGNvbnN0IHNIaW50ID0gbmV3IFNldHRpbmcoY29udGVudEVsKVxyXG5cdFx0XHQuc2V0TmFtZSgnT3B0aW9uYWwgUGFzc3dvcmQgSGludCcpXHJcblx0XHRcdC5hZGRUZXh0KCB0Yz0+e1xyXG5cdFx0XHRcdC8vdGNIaW50ID0gdGM7XHJcblx0XHRcdFx0dGMuaW5wdXRFbC5wbGFjZWhvbGRlciA9IGBQYXNzd29yZCBIaW50YDtcclxuXHRcdFx0XHR0Yy5zZXRWYWx1ZShoaW50KTtcclxuXHRcdFx0XHR0Yy5vbkNoYW5nZSggdj0+IGhpbnQgPSB2ICk7XHJcblx0XHRcdFx0dGMuaW5wdXRFbC5vbigna2V5cHJlc3MnLCAnKicsIChldiwgdGFyZ2V0KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGV2LmtleSA9PSAnRW50ZXInXHJcblx0XHRcdFx0XHRcdCYmIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnRcclxuXHRcdFx0XHRcdFx0JiYgdGFyZ2V0LnZhbHVlLmxlbmd0aCA+IDBcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIHZhbGlkYXRlKCkgKXtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH07XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0XHRpZiAoIXRoaXMuaXNFbmNyeXB0aW5nKXtcclxuXHRcdFx0c0hpbnQuc2V0dGluZ0VsLmhpZGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvKiBFTkQgSGludCB0ZXh0IHJvdyAqL1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKCBjYj0+e1xyXG5cdFx0XHRjYlxyXG5cdFx0XHRcdC5zZXRCdXR0b25UZXh0KCdDb25maXJtJylcclxuXHRcdFx0XHQub25DbGljayggZXZ0ID0+e1xyXG5cdFx0XHRcdFx0aWYgKHZhbGlkYXRlKCkpe1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgdmFsaWRhdGUgPSAoKSA6IGJvb2xlYW4gPT4ge1xyXG5cdFx0XHR0aGlzLmludmFsaWRhdGUoKTtcclxuXHJcblx0XHRcdHNDb25maXJtUGFzc3dvcmQuc2V0RGVzYygnJyk7XHJcblxyXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlybVBhc3N3b3JkICl7XHJcblx0XHRcdFx0aWYgKHBhc3N3b3JkICE9IGNvbmZpcm1QYXNzKXtcclxuXHRcdFx0XHRcdC8vIHBhc3N3b3JkcyBkb24ndCBtYXRjaFxyXG5cdFx0XHRcdFx0c0NvbmZpcm1QYXNzd29yZC5zZXREZXNjKCdQYXNzd29yZHMgZG9uXFwndCBtYXRjaCcpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5yZXN1bHRDb25maXJtZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLnJlc3VsdFBhc3N3b3JkID0gcGFzc3dvcmQ7XHJcblx0XHRcdHRoaXMucmVzdWx0SGludCA9IGhpbnQ7XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGludmFsaWRhdGUoKXtcclxuXHRcdHRoaXMucmVzdWx0Q29uZmlybWVkID0gZmFsc2U7XHJcblx0XHR0aGlzLnJlc3VsdFBhc3N3b3JkID0gbnVsbDtcclxuXHRcdHRoaXMucmVzdWx0SGludCA9IG51bGw7XHJcblx0fVxyXG5cclxufSIsImltcG9ydCB7IEVkaXRvciwgRWRpdG9yUG9zaXRpb24sIE1hcmtkb3duVmlldywgTm90aWNlLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IENyeXB0b0hlbHBlciB9IGZyb20gXCIuLi8uLi9zZXJ2aWNlcy9DcnlwdG9IZWxwZXJcIjtcclxuaW1wb3J0IHsgQ3J5cHRvSGVscGVyT2Jzb2xldGUgfSBmcm9tIFwiLi4vLi4vc2VydmljZXMvQ3J5cHRvSGVscGVyT2Jzb2xldGVcIjtcclxuaW1wb3J0IERlY3J5cHRNb2RhbCBmcm9tIFwiLi9EZWNyeXB0TW9kYWxcIjtcclxuaW1wb3J0IHsgSU1lbGRFbmNyeXB0UGx1Z2luRmVhdHVyZSB9IGZyb20gXCIuLi9JTWVsZEVuY3J5cHRQbHVnaW5GZWF0dXJlXCI7XHJcbmltcG9ydCBNZWxkRW5jcnlwdCBmcm9tIFwiLi4vLi4vbWFpblwiO1xyXG5pbXBvcnQgeyBJTWVsZEVuY3J5cHRQbHVnaW5TZXR0aW5ncyB9IGZyb20gXCIuLi8uLi9zZXR0aW5ncy9NZWxkRW5jcnlwdFBsdWdpblNldHRpbmdzXCI7XHJcbmltcG9ydCB7IElGZWF0dXJlSW5wbGFjZUVuY3J5cHRTZXR0aW5ncyB9IGZyb20gXCIuL0lGZWF0dXJlSW5wbGFjZUVuY3J5cHRTZXR0aW5nc1wiO1xyXG5pbXBvcnQgUGFzc3dvcmRNb2RhbCBmcm9tIFwiLi9QYXNzd29yZE1vZGFsXCI7XHJcbmltcG9ydCB7IFVpSGVscGVyIH0gZnJvbSBcIi4uLy4uL3NlcnZpY2VzL1VpSGVscGVyXCI7XHJcbmltcG9ydCB7IFNlc3Npb25QYXNzd29yZFNlcnZpY2UgfSBmcm9tIFwic3JjL3NlcnZpY2VzL1Nlc3Npb25QYXNzd29yZFNlcnZpY2VcIjtcclxuXHJcbmNvbnN0IF9QUkVGSVg6IHN0cmluZyA9ICclJfCflJAnO1xyXG5jb25zdCBfUFJFRklYX09CU09MRVRFOiBzdHJpbmcgPSBfUFJFRklYICsgJyAnO1xyXG5jb25zdCBfUFJFRklYX0E6IHN0cmluZyA9IF9QUkVGSVggKyAnzrEgJztcclxuY29uc3QgX1NVRkZJWDogc3RyaW5nID0gJyDwn5SQJSUnO1xyXG5cclxuY29uc3QgX0hJTlQ6IHN0cmluZyA9ICfwn5KhJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZlYXR1cmVJbnBsYWNlRW5jcnlwdCBpbXBsZW1lbnRzIElNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmV7XHJcblx0cGx1Z2luOk1lbGRFbmNyeXB0O1xyXG5cdHBsdWdpblNldHRpbmdzOiBJTWVsZEVuY3J5cHRQbHVnaW5TZXR0aW5ncztcclxuXHRmZWF0dXJlU2V0dGluZ3M6SUZlYXR1cmVJbnBsYWNlRW5jcnlwdFNldHRpbmdzO1xyXG5cclxuXHRhc3luYyBvbmxvYWQocGx1Z2luOk1lbGRFbmNyeXB0LCBzZXR0aW5nczpJTWVsZEVuY3J5cHRQbHVnaW5TZXR0aW5ncykge1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLnBsdWdpblNldHRpbmdzID0gc2V0dGluZ3M7XHJcblx0XHR0aGlzLmZlYXR1cmVTZXR0aW5ncyA9IHNldHRpbmdzLmZlYXR1cmVJbnBsYWNlRW5jcnlwdDtcclxuXHJcblx0XHRwbHVnaW4uYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiAnbWVsZC1lbmNyeXB0JyxcclxuXHRcdFx0bmFtZTogJ0VuY3J5cHQvRGVjcnlwdCcsXHJcblx0XHRcdGljb246ICdsb2NrJyxcclxuXHRcdFx0ZWRpdG9yQ2hlY2tDYWxsYmFjazogKGNoZWNraW5nLCBlZGl0b3IsIHZpZXcpID0+IHRoaXMucHJvY2Vzc0VuY3J5cHREZWNyeXB0Q29tbWFuZCggY2hlY2tpbmcsIGVkaXRvciwgdmlldywgZmFsc2UgKVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cGx1Z2luLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRpZDogJ21lbGQtZW5jcnlwdC1pbi1wbGFjZScsXHJcblx0XHRcdG5hbWU6ICdFbmNyeXB0L0RlY3J5cHQgSW4tcGxhY2UnLFxyXG5cdFx0XHRpY29uOiAnbG9jaycsXHJcblx0XHRcdGVkaXRvckNoZWNrQ2FsbGJhY2s6IChjaGVja2luZywgZWRpdG9yLCB2aWV3KSA9PiB0aGlzLnByb2Nlc3NFbmNyeXB0RGVjcnlwdENvbW1hbmQoIGNoZWNraW5nLCBlZGl0b3IsIHZpZXcsIHRydWUgKVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCl7XHJcblxyXG5cdH1cclxuXHJcblx0cHVibGljIGJ1aWxkU2V0dGluZ3NVaShcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHNhdmVTZXR0aW5nQ2FsbGJhY2sgOiAoKSA9PiBQcm9taXNlPHZvaWQ+XHJcblx0KTogdm9pZCB7XHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldEhlYWRpbmcoKVxyXG5cdFx0XHQuc2V0TmFtZSgnSW4tcGxhY2UgRW5jcnlwdGlvbiBTZXR0aW5ncycpXHJcblx0XHQ7XHJcblxyXG5cdFx0Ly8gU2VsZWN0aW9uIGVuY3J5cHQgZmVhdHVyZSBzZXR0aW5ncyBiZWxvd1xyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKCdFeHBhbmQgc2VsZWN0aW9uIHRvIHdob2xlIGxpbmU/JylcclxuXHRcdFx0LnNldERlc2MoJ1BhcnRpYWwgc2VsZWN0aW9ucyB3aWxsIGdldCBleHBhbmRlZCB0byB0aGUgd2hvbGUgbGluZS4nKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKCB0b2dnbGUgPT57XHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5mZWF0dXJlU2V0dGluZ3MuZXhwYW5kVG9XaG9sZUxpbmVzKVxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCBhc3luYyB2YWx1ZSA9PntcclxuXHRcdFx0XHRcdFx0dGhpcy5mZWF0dXJlU2V0dGluZ3MuZXhwYW5kVG9XaG9sZUxpbmVzID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHNhdmVTZXR0aW5nQ2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKCdDb3B5IGJ1dHRvbj8nKVxyXG5cdFx0XHQuc2V0RGVzYygnU2hvdyBhIGJ1dHRvbiB0byBjb3B5IGRlY3J5cHRlZCB0ZXh0LicpXHJcblx0XHRcdC5hZGRUb2dnbGUoIHRvZ2dsZSA9PntcclxuXHRcdFx0XHR0b2dnbGVcclxuXHRcdFx0XHRcdC5zZXRWYWx1ZSh0aGlzLmZlYXR1cmVTZXR0aW5ncy5zaG93Q29weUJ1dHRvbilcclxuXHRcdFx0XHRcdC5vbkNoYW5nZSggYXN5bmMgdmFsdWUgPT57XHJcblx0XHRcdFx0XHRcdHRoaXMuZmVhdHVyZVNldHRpbmdzLnNob3dDb3B5QnV0dG9uID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdGF3YWl0IHNhdmVTZXR0aW5nQ2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblxyXG5cdH1cclxuXHJcblx0XHJcblxyXG5cdHByaXZhdGUgcHJvY2Vzc0VuY3J5cHREZWNyeXB0Q29tbWFuZChcclxuXHRcdGNoZWNraW5nOiBib29sZWFuLFxyXG5cdFx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0XHR2aWV3OiBNYXJrZG93blZpZXcsXHJcblx0XHRkZWNyeXB0SW5QbGFjZTogYm9vbGVhblxyXG5cdCk6IGJvb2xlYW4ge1xyXG5cdFx0aWYgKCBjaGVja2luZyAmJiBVaUhlbHBlci5pc1NldHRpbmdzTW9kYWxPcGVuKCkgKXtcclxuXHRcdFx0Ly8gU2V0dGluZ3MgaXMgb3BlbiwgZW5zdXJlcyB0aGlzIGNvbW1hbmQgY2FuIHNob3cgdXAgaW4gb3RoZXJcclxuXHRcdFx0Ly8gcGx1Z2lucyB3aGljaCBsaXN0IGNvbW1hbmRzIGUuZy4gY3VzdG9taXphYmxlLXNpZGViYXJcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IHN0YXJ0UG9zID0gZWRpdG9yLmdldEN1cnNvcignZnJvbScpO1xyXG5cdFx0bGV0IGVuZFBvcyA9IGVkaXRvci5nZXRDdXJzb3IoJ3RvJyk7XHJcblxyXG5cdFx0aWYgKHRoaXMuZmVhdHVyZVNldHRpbmdzLmV4cGFuZFRvV2hvbGVMaW5lcyl7XHJcblx0XHRcdGNvbnN0IHN0YXJ0TGluZSA9IHN0YXJ0UG9zLmxpbmU7XHJcblx0XHRcdHN0YXJ0UG9zID0geyBsaW5lOiBzdGFydExpbmUsIGNoOiAwIH07IC8vIHdhbnQgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBsaW5lXHJcblxyXG5cdFx0XHRjb25zdCBlbmRMaW5lID0gZW5kUG9zLmxpbmU7XHJcblx0XHRcdGNvbnN0IGVuZExpbmVUZXh0ID0gZWRpdG9yLmdldExpbmUoZW5kTGluZSk7XHJcblx0XHRcdGVuZFBvcyA9IHsgbGluZTogZW5kTGluZSwgY2g6IGVuZExpbmVUZXh0Lmxlbmd0aCB9OyAvLyB3YW50IHRoZSBlbmQgb2YgbGFzdCBsaW5lXHJcblx0XHR9ZWxzZXtcclxuXHRcdFx0aWYgKCAhZWRpdG9yLnNvbWV0aGluZ1NlbGVjdGVkKCkgKXtcclxuXHRcdFx0XHQvLyBub3RoaW5nIHNlbGVjdGVkLCBhc3N1bWUgdXNlciB3YW50cyB0byBkZWNyeXB0LCBleHBhbmQgdG8gc3RhcnQgYW5kIGVuZCBtYXJrZXJzXHJcblx0XHRcdFx0c3RhcnRQb3MgPSB0aGlzLmdldENsb3Nlc3RQcmV2VGV4dEN1cnNvclBvcyhlZGl0b3IsIF9QUkVGSVgsIHN0YXJ0UG9zICk7XHJcblx0XHRcdFx0ZW5kUG9zID0gdGhpcy5nZXRDbG9zZXN0TmV4dFRleHRDdXJzb3JQb3MoZWRpdG9yLCBfU1VGRklYLCBlbmRQb3MgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHNlbGVjdGlvblRleHQgPSBlZGl0b3IuZ2V0UmFuZ2Uoc3RhcnRQb3MsIGVuZFBvcyk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMucHJvY2Vzc1NlbGVjdGlvbihcclxuXHRcdFx0Y2hlY2tpbmcsXHJcblx0XHRcdGVkaXRvcixcclxuXHRcdFx0c2VsZWN0aW9uVGV4dCxcclxuXHRcdFx0c3RhcnRQb3MsXHJcblx0XHRcdGVuZFBvcyxcclxuXHRcdFx0ZGVjcnlwdEluUGxhY2VcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldENsb3Nlc3RQcmV2VGV4dEN1cnNvclBvcyhlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6RWRpdG9yUG9zaXRpb24gKTogRWRpdG9yUG9zaXRpb257XHJcblx0XHRjb25zdCBpbml0T2Zmc2V0ID0gZWRpdG9yLnBvc1RvT2Zmc2V0KCBlZGl0b3IuZ2V0Q3Vyc29yKFwiZnJvbVwiKSApO1xyXG5cclxuXHRcdGZvciAobGV0IG9mZnNldCA9IGluaXRPZmZzZXQ7IG9mZnNldCA+PSAwOyBvZmZzZXQtLSkge1xyXG5cdFx0XHRjb25zdCBvZmZzZXRQb3MgPSBlZGl0b3Iub2Zmc2V0VG9Qb3Mob2Zmc2V0KTtcclxuXHRcdFx0Y29uc3QgdGV4dEVuZE9mZnNldCA9IG9mZnNldCArIHRleHQubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBwcmVmaXhFbmRQb3MgPSBlZGl0b3Iub2Zmc2V0VG9Qb3ModGV4dEVuZE9mZnNldCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0ZXN0VGV4dCA9IGVkaXRvci5nZXRSYW5nZSggb2Zmc2V0UG9zLCBwcmVmaXhFbmRQb3MgKTtcclxuXHRcdFx0aWYgKHRlc3RUZXh0ID09IHRleHQpe1xyXG5cdFx0XHRcdHJldHVybiBvZmZzZXRQb3M7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGVmYXVsdFZhbHVlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRDbG9zZXN0TmV4dFRleHRDdXJzb3JQb3MoZWRpdG9yOiBFZGl0b3IsIHRleHQ6IHN0cmluZywgZGVmYXVsdFZhbHVlOkVkaXRvclBvc2l0aW9uICk6IEVkaXRvclBvc2l0aW9ue1xyXG5cdFx0Y29uc3QgaW5pdE9mZnNldCA9IGVkaXRvci5wb3NUb09mZnNldCggZWRpdG9yLmdldEN1cnNvcihcImZyb21cIikgKTtcclxuXHRcdGNvbnN0IGxhc3RMaW5lTnVtID0gZWRpdG9yLmxhc3RMaW5lKCk7XHJcblxyXG5cdFx0bGV0IG1heE9mZnNldCA9IGVkaXRvci5wb3NUb09mZnNldCgge2xpbmU6bGFzdExpbmVOdW0sIGNoOmVkaXRvci5nZXRMaW5lKGxhc3RMaW5lTnVtKS5sZW5ndGh9ICk7XHJcblxyXG5cdFx0Zm9yIChsZXQgb2Zmc2V0ID0gaW5pdE9mZnNldDsgb2Zmc2V0IDw9IG1heE9mZnNldCAtIHRleHQubGVuZ3RoOyBvZmZzZXQrKykge1xyXG5cdFx0XHRjb25zdCBvZmZzZXRQb3MgPSBlZGl0b3Iub2Zmc2V0VG9Qb3Mob2Zmc2V0KTtcclxuXHRcdFx0Y29uc3QgdGV4dEVuZE9mZnNldCA9IG9mZnNldCArIHRleHQubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBwcmVmaXhFbmRQb3MgPSBlZGl0b3Iub2Zmc2V0VG9Qb3ModGV4dEVuZE9mZnNldCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0ZXN0VGV4dCA9IGVkaXRvci5nZXRSYW5nZSggb2Zmc2V0UG9zLCBwcmVmaXhFbmRQb3MgKTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICh0ZXN0VGV4dCA9PSB0ZXh0KXtcclxuXHRcdFx0XHRyZXR1cm4gcHJlZml4RW5kUG9zO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHJldHVybiBkZWZhdWx0VmFsdWU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFuYWx5c2VTZWxlY3Rpb24oIHNlbGVjdGlvblRleHQ6IHN0cmluZyApOlNlbGVjdGlvbkFuYWx5c2lze1xyXG5cdFx0XHJcblx0XHRjb25zdCByZXN1bHQgPSBuZXcgU2VsZWN0aW9uQW5hbHlzaXMoKTtcclxuXHJcblx0XHRyZXN1bHQuaXNFbXB0eSA9IHNlbGVjdGlvblRleHQubGVuZ3RoID09PSAwO1xyXG5cclxuXHRcdHJlc3VsdC5oYXNPYnNvbGV0ZUVuY3J5cHRlZFByZWZpeCA9IHNlbGVjdGlvblRleHQuc3RhcnRzV2l0aChfUFJFRklYX09CU09MRVRFKTtcclxuXHRcdHJlc3VsdC5oYXNFbmNyeXB0ZWRQcmVmaXggPSByZXN1bHQuaGFzT2Jzb2xldGVFbmNyeXB0ZWRQcmVmaXggfHwgc2VsZWN0aW9uVGV4dC5zdGFydHNXaXRoKF9QUkVGSVhfQSk7XHJcblxyXG5cdFx0cmVzdWx0Lmhhc0RlY3J5cHRTdWZmaXggPSBzZWxlY3Rpb25UZXh0LmVuZHNXaXRoKF9TVUZGSVgpO1xyXG5cclxuXHRcdHJlc3VsdC5jb250YWluc0VuY3J5cHRlZE1hcmtlcnMgPVxyXG5cdFx0XHRzZWxlY3Rpb25UZXh0LmNvbnRhaW5zKF9QUkVGSVhfT0JTT0xFVEUpXHJcblx0XHRcdHx8IHNlbGVjdGlvblRleHQuY29udGFpbnMoX1BSRUZJWF9BKVxyXG5cdFx0XHR8fCBzZWxlY3Rpb25UZXh0LmNvbnRhaW5zKF9TVUZGSVgpXHJcblx0XHQ7XHJcblxyXG5cdFx0cmVzdWx0LmNhbkRlY3J5cHQgPSByZXN1bHQuaGFzRW5jcnlwdGVkUHJlZml4ICYmIHJlc3VsdC5oYXNEZWNyeXB0U3VmZml4O1xyXG5cdFx0cmVzdWx0LmNhbkVuY3J5cHQgPSAhcmVzdWx0Lmhhc0VuY3J5cHRlZFByZWZpeCAmJiAhcmVzdWx0LmNvbnRhaW5zRW5jcnlwdGVkTWFya2VycztcclxuXHRcdFxyXG5cdFx0aWYgKHJlc3VsdC5jYW5EZWNyeXB0KXtcclxuXHRcdFx0cmVzdWx0LmRlY3J5cHRhYmxlID0gdGhpcy5wYXJzZURlY3J5cHRhYmxlQ29udGVudChzZWxlY3Rpb25UZXh0KTtcclxuXHRcdFx0aWYgKHJlc3VsdC5kZWNyeXB0YWJsZSA9PSBudWxsKXtcclxuXHRcdFx0XHRyZXN1bHQuY2FuRGVjcnlwdCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcHJvY2Vzc1NlbGVjdGlvbihcclxuXHRcdGNoZWNraW5nOiBib29sZWFuLFxyXG5cdFx0ZWRpdG9yOiBFZGl0b3IsXHJcblx0XHRzZWxlY3Rpb25UZXh0OiBzdHJpbmcsXHJcblx0XHRmaW5hbFNlbGVjdGlvblN0YXJ0OiBDb2RlTWlycm9yLlBvc2l0aW9uLFxyXG5cdFx0ZmluYWxTZWxlY3Rpb25FbmQ6IENvZGVNaXJyb3IuUG9zaXRpb24sXHJcblx0XHRkZWNyeXB0SW5QbGFjZTogYm9vbGVhbixcclxuXHRcdGFsbG93RW5jcnlwdGlvbjpib29sZWFuID0gdHJ1ZVxyXG5cdCl7XHJcblxyXG5cdFx0Y29uc3Qgc2VsZWN0aW9uQW5hbHlzaXMgPSB0aGlzLmFuYWx5c2VTZWxlY3Rpb24oc2VsZWN0aW9uVGV4dCk7XHJcblxyXG5cdFx0aWYgKHNlbGVjdGlvbkFuYWx5c2lzLmlzRW1wdHkpIHtcclxuXHRcdFx0aWYgKCFjaGVja2luZyl7XHJcblx0XHRcdFx0bmV3IE5vdGljZSgnTm90aGluZyB0byBFbmNyeXB0LicpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIXNlbGVjdGlvbkFuYWx5c2lzLmNhbkRlY3J5cHQgJiYgIXNlbGVjdGlvbkFuYWx5c2lzLmNhbkVuY3J5cHQpIHtcclxuXHRcdFx0aWYgKCFjaGVja2luZyl7XHJcblx0XHRcdFx0bmV3IE5vdGljZSgnVW5hYmxlIHRvIEVuY3J5cHQgb3IgRGVjcnlwdCB0aGF0LicpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoc2VsZWN0aW9uQW5hbHlzaXMuY2FuRW5jcnlwdCAmJiAhYWxsb3dFbmNyeXB0aW9uKXtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjaGVja2luZykge1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcblx0XHRcclxuXHRcdC8vIEZldGNoIHBhc3N3b3JkIGZyb20gdXNlclxyXG5cclxuXHRcdC8vIGRldGVybWluZSBkZWZhdWx0IHBhc3N3b3JkIGFuZCBoaW50XHJcblx0XHRsZXQgZGVmYXVsdFBhc3N3b3JkID0gJyc7XHJcblx0XHRsZXQgZGVmYXVsdEhpbnQgOiBzdHJpbmcgPSBzZWxlY3Rpb25BbmFseXNpcy5kZWNyeXB0YWJsZT8uaGludDtcclxuXHRcdGlmICggdGhpcy5wbHVnaW5TZXR0aW5ncy5yZW1lbWJlclBhc3N3b3JkICl7XHJcblx0XHRcdGNvbnN0IGJlc3RHdWVzc1Bhc3N3b3JkQW5kSGludCA9IFNlc3Npb25QYXNzd29yZFNlcnZpY2UuZ2V0QmVzdEd1ZXNzKCBhY3RpdmVGaWxlICk7XHJcblx0XHRcdGNvbnNvbGUuZGVidWcoe2Jlc3RHdWVzc1Bhc3N3b3JkQW5kSGludH0pO1xyXG5cclxuXHRcdFx0ZGVmYXVsdFBhc3N3b3JkID0gYmVzdEd1ZXNzUGFzc3dvcmRBbmRIaW50LnBhc3N3b3JkO1xyXG5cdFx0XHRkZWZhdWx0SGludCA9IGRlZmF1bHRIaW50ID8/IGJlc3RHdWVzc1Bhc3N3b3JkQW5kSGludC5oaW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbmZpcm1QYXNzd29yZCA9IHNlbGVjdGlvbkFuYWx5c2lzLmNhbkVuY3J5cHQgJiYgdGhpcy5wbHVnaW5TZXR0aW5ncy5jb25maXJtUGFzc3dvcmQ7XHJcblxyXG5cdFx0Y29uc3QgcHdNb2RhbCA9IG5ldyBQYXNzd29yZE1vZGFsKFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdHNlbGVjdGlvbkFuYWx5c2lzLmNhbkVuY3J5cHQsXHJcblx0XHRcdGNvbmZpcm1QYXNzd29yZCxcclxuXHRcdFx0ZGVmYXVsdFBhc3N3b3JkLFxyXG5cdFx0XHRkZWZhdWx0SGludFxyXG5cdFx0KTtcclxuXHJcblx0XHRwd01vZGFsLm9uQ2xvc2UgPSBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGlmICggIXB3TW9kYWwucmVzdWx0Q29uZmlybWVkICl7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IHB3ID0gcHdNb2RhbC5yZXN1bHRQYXNzd29yZCA/PyAnJ1xyXG5cdFx0XHRjb25zdCBoaW50ID0gcHdNb2RhbC5yZXN1bHRIaW50ID8/ICcnO1xyXG5cclxuXHRcdFx0aWYgKHNlbGVjdGlvbkFuYWx5c2lzLmNhbkVuY3J5cHQpIHtcclxuXHRcdFx0XHRjb25zdCBlbmNyeXB0YWJsZSA9IG5ldyBFbmNyeXB0YWJsZSgpO1xyXG5cdFx0XHRcdGVuY3J5cHRhYmxlLnRleHQgPSBzZWxlY3Rpb25UZXh0O1xyXG5cdFx0XHRcdGVuY3J5cHRhYmxlLmhpbnQgPSBoaW50O1xyXG5cclxuXHRcdFx0XHR0aGlzLmVuY3J5cHRTZWxlY3Rpb24oXHJcblx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRlbmNyeXB0YWJsZSxcclxuXHRcdFx0XHRcdHB3LFxyXG5cdFx0XHRcdFx0ZmluYWxTZWxlY3Rpb25TdGFydCxcclxuXHRcdFx0XHRcdGZpbmFsU2VsZWN0aW9uRW5kXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtZW1iZXIgcGFzc3dvcmRcclxuXHRcdFx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLnB1dChcdHsgcGFzc3dvcmQ6cHcsIGhpbnQ6IGhpbnQgfSwgYWN0aXZlRmlsZSApO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0bGV0IGRlY3J5cHRTdWNjZXNzIDogQm9vbGVhbjtcclxuXHRcdFx0XHRpZiAoc2VsZWN0aW9uQW5hbHlzaXMuZGVjcnlwdGFibGUudmVyc2lvbiA9PSAxKXtcclxuXHRcdFx0XHRcdGRlY3J5cHRTdWNjZXNzID0gYXdhaXQgdGhpcy5kZWNyeXB0U2VsZWN0aW9uX2EoXHJcblx0XHRcdFx0XHRcdGVkaXRvcixcclxuXHRcdFx0XHRcdFx0c2VsZWN0aW9uQW5hbHlzaXMuZGVjcnlwdGFibGUsXHJcblx0XHRcdFx0XHRcdHB3LFxyXG5cdFx0XHRcdFx0XHRmaW5hbFNlbGVjdGlvblN0YXJ0LFxyXG5cdFx0XHRcdFx0XHRmaW5hbFNlbGVjdGlvbkVuZCxcclxuXHRcdFx0XHRcdFx0ZGVjcnlwdEluUGxhY2VcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHRkZWNyeXB0U3VjY2VzcyA9IGF3YWl0IHRoaXMuZGVjcnlwdFNlbGVjdGlvbk9ic29sZXRlKFxyXG5cdFx0XHRcdFx0XHRlZGl0b3IsXHJcblx0XHRcdFx0XHRcdHNlbGVjdGlvbkFuYWx5c2lzLmRlY3J5cHRhYmxlLFxyXG5cdFx0XHRcdFx0XHRwdyxcclxuXHRcdFx0XHRcdFx0ZmluYWxTZWxlY3Rpb25TdGFydCxcclxuXHRcdFx0XHRcdFx0ZmluYWxTZWxlY3Rpb25FbmQsXHJcblx0XHRcdFx0XHRcdGRlY3J5cHRJblBsYWNlXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcmVtZW1iZXIgcGFzc3dvcmQ/XHJcblx0XHRcdFx0aWYgKCBkZWNyeXB0U3VjY2VzcyApIHtcclxuXHRcdFx0XHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UucHV0KFx0eyBwYXNzd29yZDpwdywgaGludDogaGludCB9LCBhY3RpdmVGaWxlICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRwd01vZGFsLm9wZW4oKTtcclxuXHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZW5jcnlwdFNlbGVjdGlvbihcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0ZW5jcnlwdGFibGU6IEVuY3J5cHRhYmxlLFxyXG5cdFx0cGFzc3dvcmQ6IHN0cmluZyxcclxuXHRcdGZpbmFsU2VsZWN0aW9uU3RhcnQ6IENvZGVNaXJyb3IuUG9zaXRpb24sXHJcblx0XHRmaW5hbFNlbGVjdGlvbkVuZDogQ29kZU1pcnJvci5Qb3NpdGlvbixcclxuXHQpIHtcclxuXHRcdC8vZW5jcnlwdFxyXG5cdFx0Y29uc3QgY3J5cHRvID0gbmV3IENyeXB0b0hlbHBlcigpO1xyXG5cdFx0Y29uc3QgZW5jb2RlZFRleHQgPSB0aGlzLmVuY29kZUVuY3J5cHRpb24oXHJcblx0XHRcdGF3YWl0IGNyeXB0by5lbmNyeXB0VG9CYXNlNjQoZW5jcnlwdGFibGUudGV4dCwgcGFzc3dvcmQpLFxyXG5cdFx0XHRlbmNyeXB0YWJsZS5oaW50XHJcblx0XHQpO1xyXG5cdFx0ZWRpdG9yLnNldFNlbGVjdGlvbihmaW5hbFNlbGVjdGlvblN0YXJ0LCBmaW5hbFNlbGVjdGlvbkVuZCk7XHJcblx0XHRlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihlbmNvZGVkVGV4dCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGRlY3J5cHRTZWxlY3Rpb25fYShcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0ZGVjcnlwdGFibGU6IERlY3J5cHRhYmxlLFxyXG5cdFx0cGFzc3dvcmQ6IHN0cmluZyxcclxuXHRcdHNlbGVjdGlvblN0YXJ0OiBDb2RlTWlycm9yLlBvc2l0aW9uLFxyXG5cdFx0c2VsZWN0aW9uRW5kOiBDb2RlTWlycm9yLlBvc2l0aW9uLFxyXG5cdFx0ZGVjcnlwdEluUGxhY2U6IGJvb2xlYW5cclxuXHQpIDogUHJvbWlzZTxib29sZWFuPiB7XHJcblx0XHQvLyBkZWNyeXB0XHJcblxyXG5cdFx0Y29uc3QgY3J5cHRvID0gbmV3IENyeXB0b0hlbHBlcigpO1xyXG5cdFx0Y29uc3QgZGVjcnlwdGVkVGV4dCA9IGF3YWl0IGNyeXB0by5kZWNyeXB0RnJvbUJhc2U2NChkZWNyeXB0YWJsZS5iYXNlNjRDaXBoZXJUZXh0LCBwYXNzd29yZCk7XHJcblx0XHRpZiAoZGVjcnlwdGVkVGV4dCA9PT0gbnVsbCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKCfinYwgRGVjcnlwdGlvbiBmYWlsZWQhJyk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRpZiAoZGVjcnlwdEluUGxhY2UpIHtcclxuXHRcdFx0XHRlZGl0b3Iuc2V0U2VsZWN0aW9uKHNlbGVjdGlvblN0YXJ0LCBzZWxlY3Rpb25FbmQpO1xyXG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlU2VsZWN0aW9uKGRlY3J5cHRlZFRleHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnN0IGRlY3J5cHRNb2RhbCA9IG5ldyBEZWNyeXB0TW9kYWwodGhpcy5wbHVnaW4uYXBwLCAn8J+UkycsIGRlY3J5cHRlZFRleHQsIHRoaXMuZmVhdHVyZVNldHRpbmdzLnNob3dDb3B5QnV0dG9uKTtcclxuXHRcdFx0XHRkZWNyeXB0TW9kYWwub25DbG9zZSA9ICgpID0+IHtcclxuXHRcdFx0XHRcdGVkaXRvci5mb2N1cygpO1xyXG5cdFx0XHRcdFx0aWYgKGRlY3J5cHRNb2RhbC5kZWNyeXB0SW5QbGFjZSkge1xyXG5cdFx0XHRcdFx0XHRlZGl0b3Iuc2V0U2VsZWN0aW9uKHNlbGVjdGlvblN0YXJ0LCBzZWxlY3Rpb25FbmQpO1xyXG5cdFx0XHRcdFx0XHRlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihkZWNyeXB0ZWRUZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZGVjcnlwdE1vZGFsLm9wZW4oKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGRlY3J5cHRTZWxlY3Rpb25PYnNvbGV0ZShcclxuXHRcdGVkaXRvcjogRWRpdG9yLFxyXG5cdFx0ZGVjcnlwdGFibGU6IERlY3J5cHRhYmxlLFxyXG5cdFx0cGFzc3dvcmQ6IHN0cmluZyxcclxuXHRcdHNlbGVjdGlvblN0YXJ0OiBDb2RlTWlycm9yLlBvc2l0aW9uLFxyXG5cdFx0c2VsZWN0aW9uRW5kOiBDb2RlTWlycm9yLlBvc2l0aW9uLFxyXG5cdFx0ZGVjcnlwdEluUGxhY2U6IGJvb2xlYW5cclxuXHQpIDpQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdC8vIGRlY3J5cHRcclxuXHRcdGNvbnN0IGJhc2U2NENpcGhlclRleHQgPSB0aGlzLnJlbW92ZU1hcmtlcnMoZGVjcnlwdGFibGUuYmFzZTY0Q2lwaGVyVGV4dCk7XHJcblx0XHRjb25zdCBjcnlwdG8gPSBuZXcgQ3J5cHRvSGVscGVyT2Jzb2xldGUoKTtcclxuXHRcdGNvbnN0IGRlY3J5cHRlZFRleHQgPSBhd2FpdCBjcnlwdG8uZGVjcnlwdEZyb21CYXNlNjQoYmFzZTY0Q2lwaGVyVGV4dCwgcGFzc3dvcmQpO1xyXG5cdFx0aWYgKGRlY3J5cHRlZFRleHQgPT09IG51bGwpIHtcclxuXHRcdFx0bmV3IE5vdGljZSgn4p2MIERlY3J5cHRpb24gZmFpbGVkIScpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0aWYgKGRlY3J5cHRJblBsYWNlKSB7XHJcblx0XHRcdFx0ZWRpdG9yLnNldFNlbGVjdGlvbihzZWxlY3Rpb25TdGFydCwgc2VsZWN0aW9uRW5kKTtcclxuXHRcdFx0XHRlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihkZWNyeXB0ZWRUZXh0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBkZWNyeXB0TW9kYWwgPSBuZXcgRGVjcnlwdE1vZGFsKHRoaXMucGx1Z2luLmFwcCwgJ/CflJMnLCBkZWNyeXB0ZWRUZXh0LCB0aGlzLmZlYXR1cmVTZXR0aW5ncy5zaG93Q29weUJ1dHRvbik7XHJcblx0XHRcdFx0ZGVjcnlwdE1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRlZGl0b3IuZm9jdXMoKTtcclxuXHRcdFx0XHRcdGlmIChkZWNyeXB0TW9kYWwuZGVjcnlwdEluUGxhY2UpIHtcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLnNldFNlbGVjdGlvbihzZWxlY3Rpb25TdGFydCwgc2VsZWN0aW9uRW5kKTtcclxuXHRcdFx0XHRcdFx0ZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24oZGVjcnlwdGVkVGV4dCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGRlY3J5cHRNb2RhbC5vcGVuKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBwYXJzZURlY3J5cHRhYmxlQ29udGVudCh0ZXh0OiBzdHJpbmcpIDogRGVjcnlwdGFibGV7XHJcblx0XHRjb25zdCByZXN1bHQgPSBuZXcgRGVjcnlwdGFibGUoKTtcclxuXHJcblx0XHRsZXQgY29udGVudCA9IHRleHQ7XHJcblx0XHRpZiAoY29udGVudC5zdGFydHNXaXRoKF9QUkVGSVhfQSkgJiYgY29udGVudC5lbmRzV2l0aChfU1VGRklYKSkge1xyXG5cdFx0XHRyZXN1bHQudmVyc2lvbj0xO1xyXG5cdFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKF9QUkVGSVhfQSwgJycpLnJlcGxhY2UoX1NVRkZJWCwgJycpO1xyXG5cdFx0fWVsc2UgaWYgKGNvbnRlbnQuc3RhcnRzV2l0aChfUFJFRklYX09CU09MRVRFKSAmJiBjb250ZW50LmVuZHNXaXRoKF9TVUZGSVgpKSB7XHJcblx0XHRcdHJlc3VsdC52ZXJzaW9uPTA7XHJcblx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoX1BSRUZJWF9PQlNPTEVURSwgJycpLnJlcGxhY2UoX1NVRkZJWCwgJycpO1xyXG5cdFx0fWVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDsgLy8gaW52YWxpZCBmb3JtYXRcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBpZiB0aGVyZSBpcyBhIGhpbnRcclxuXHRcdGlmIChjb250ZW50LnN1YnN0cmluZygwLF9ISU5ULmxlbmd0aCkgPT0gX0hJTlQpe1xyXG5cdFx0XHRjb25zdCBlbmRIaW50TWFya2VyID0gY29udGVudC5pbmRleE9mKF9ISU5ULF9ISU5ULmxlbmd0aCk7XHJcblx0XHRcdGlmIChlbmRIaW50TWFya2VyPDApe1xyXG5cdFx0XHRcdHJldHVybiBudWxsOyAvLyBpbnZhbGlkIGZvcm1hdFxyXG5cdFx0XHR9XHJcblx0XHRcdHJlc3VsdC5oaW50ID0gY29udGVudC5zdWJzdHJpbmcoX0hJTlQubGVuZ3RoLGVuZEhpbnRNYXJrZXIpXHJcblx0XHRcdHJlc3VsdC5iYXNlNjRDaXBoZXJUZXh0ID0gY29udGVudC5zdWJzdHJpbmcoZW5kSGludE1hcmtlcitfSElOVC5sZW5ndGgpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHJlc3VsdC5iYXNlNjRDaXBoZXJUZXh0ID0gY29udGVudDtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbW92ZU1hcmtlcnModGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICh0ZXh0LnN0YXJ0c1dpdGgoX1BSRUZJWF9BKSAmJiB0ZXh0LmVuZHNXaXRoKF9TVUZGSVgpKSB7XHJcblx0XHRcdHJldHVybiB0ZXh0LnJlcGxhY2UoX1BSRUZJWF9BLCAnJykucmVwbGFjZShfU1VGRklYLCAnJyk7XHJcblx0XHR9XHJcblx0XHRpZiAodGV4dC5zdGFydHNXaXRoKF9QUkVGSVhfT0JTT0xFVEUpICYmIHRleHQuZW5kc1dpdGgoX1NVRkZJWCkpIHtcclxuXHRcdFx0cmV0dXJuIHRleHQucmVwbGFjZShfUFJFRklYX09CU09MRVRFLCAnJykucmVwbGFjZShfU1VGRklYLCAnJyk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGV4dDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZW5jb2RlRW5jcnlwdGlvbiggZW5jcnlwdGVkVGV4dDogc3RyaW5nLCBoaW50OiBzdHJpbmcgKTogc3RyaW5nIHtcclxuXHRcdGlmICghZW5jcnlwdGVkVGV4dC5jb250YWlucyhfUFJFRklYX09CU09MRVRFKSAmJiAhZW5jcnlwdGVkVGV4dC5jb250YWlucyhfUFJFRklYX0EpICYmICFlbmNyeXB0ZWRUZXh0LmNvbnRhaW5zKF9TVUZGSVgpKSB7XHJcblx0XHRcdGlmIChoaW50KXtcclxuXHRcdFx0XHRyZXR1cm4gX1BSRUZJWF9BLmNvbmNhdChfSElOVCwgaGludCwgX0hJTlQsIGVuY3J5cHRlZFRleHQsIF9TVUZGSVgpO1x0XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIF9QUkVGSVhfQS5jb25jYXQoZW5jcnlwdGVkVGV4dCwgX1NVRkZJWCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZW5jcnlwdGVkVGV4dDtcclxuXHR9XHJcbn1cclxuXHJcbmNsYXNzIFNlbGVjdGlvbkFuYWx5c2lze1xyXG5cdGlzRW1wdHk6IGJvb2xlYW47XHJcblx0aGFzT2Jzb2xldGVFbmNyeXB0ZWRQcmVmaXg6IGJvb2xlYW47XHJcblx0aGFzRW5jcnlwdGVkUHJlZml4OiBib29sZWFuO1xyXG5cdGhhc0RlY3J5cHRTdWZmaXg6IGJvb2xlYW47XHJcblx0Y2FuRGVjcnlwdDogYm9vbGVhbjtcclxuXHRjYW5FbmNyeXB0OiBib29sZWFuO1xyXG5cdGNvbnRhaW5zRW5jcnlwdGVkTWFya2VyczogYm9vbGVhbjtcclxuXHRkZWNyeXB0YWJsZSA6IERlY3J5cHRhYmxlO1xyXG59XHJcblxyXG5jbGFzcyBFbmNyeXB0YWJsZXtcclxuXHR0ZXh0OnN0cmluZztcclxuXHRoaW50OnN0cmluZztcclxufVxyXG5cclxuY2xhc3MgRGVjcnlwdGFibGV7XHJcblx0dmVyc2lvbjogbnVtYmVyO1xyXG5cdGJhc2U2NENpcGhlclRleHQ6c3RyaW5nO1xyXG5cdGhpbnQ6c3RyaW5nO1xyXG59IiwiaW1wb3J0IHsgTWVudSwgTm90aWNlLCBTZXR0aW5nLCBUZXh0Q29tcG9uZW50LCBUZXh0RmlsZVZpZXcgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgU2Vzc2lvblBhc3N3b3JkU2VydmljZSB9IGZyb20gJ3NyYy9zZXJ2aWNlcy9TZXNzaW9uUGFzc3dvcmRTZXJ2aWNlJztcclxuaW1wb3J0IHsgVWlIZWxwZXIgfSBmcm9tICdzcmMvc2VydmljZXMvVWlIZWxwZXInO1xyXG5pbXBvcnQgeyBDcnlwdG9IZWxwZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9DcnlwdG9IZWxwZXInO1xyXG5cclxuZW51bSBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXdTdGF0ZUVudW17XHJcblx0aW5pdCxcclxuXHRkZWNyeXB0Tm90ZSxcclxuXHRlZGl0Tm90ZSxcclxuXHRjaGFuZ2VQYXNzd29yZCxcclxuXHRuZXdOb3RlXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfRU5DUllQVEVEX0ZJTEVfQ09OVEVOVCA9IFwibWVsZC1lbmNyeXB0ZWQtZmlsZS1jb250ZW50LXZpZXdcIjtcclxuZXhwb3J0IGNsYXNzIEVuY3J5cHRlZEZpbGVDb250ZW50VmlldyBleHRlbmRzIFRleHRGaWxlVmlldyB7XHJcblx0XHJcblx0Ly8gU3RhdGVcclxuXHRjdXJyZW50VmlldyA6IEVuY3J5cHRlZEZpbGVDb250ZW50Vmlld1N0YXRlRW51bSA9IEVuY3J5cHRlZEZpbGVDb250ZW50Vmlld1N0YXRlRW51bS5pbml0O1xyXG5cdGVuY3J5cHRpb25QYXNzd29yZDpzdHJpbmcgPSAnJztcclxuXHRoaW50OnN0cmluZyA9ICcnO1xyXG5cdGN1cnJlbnRFZGl0b3JUZXh0OnN0cmluZyA9ICcnO1xyXG5cdC8vIGVuZCBzdGF0ZVxyXG5cdFxyXG5cdGVsQWN0aW9uSWNvbkxvY2tOb3RlIDogSFRNTEVsZW1lbnQ7XHJcblx0ZWxBY3Rpb25DaGFuZ2VQYXNzd29yZCA6IEhUTUxFbGVtZW50O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XHJcblx0XHRzdXBlcihsZWFmKTtcclxuXHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ0VuY3J5cHRlZEZpbGVDb250ZW50Vmlldy5jb25zdHJ1Y3RvcicsIHtsZWFmfSk7XHJcblxyXG5cdFx0dGhpcy5lbEFjdGlvbkljb25Mb2NrTm90ZSA9IHRoaXMuYWRkQWN0aW9uKCAnbG9jaycsICdMb2NrJywgKCkgPT4gdGhpcy5hY3Rpb25Mb2NrRmlsZSgpICk7XHJcblxyXG5cdFx0dGhpcy5lbEFjdGlvbkNoYW5nZVBhc3N3b3JkID0gdGhpcy5hZGRBY3Rpb24oICdrZXknLCAnQ2hhbmdlIFBhc3N3b3JkJywgKCkgPT4gdGhpcy5hY3Rpb25DaGFuZ2VQYXNzd29yZCgpICk7XHJcblx0XHRcclxuXHRcdHRoaXMuY29udGVudEVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XHJcblxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhY3Rpb25Mb2NrRmlsZSgpe1xyXG5cdFx0dGhpcy5lbmNyeXB0aW9uUGFzc3dvcmQgPSAnJztcclxuXHRcdHRoaXMucmVmcmVzaFZpZXcoRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmRlY3J5cHROb3RlKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWN0aW9uQ2hhbmdlUGFzc3dvcmQoKXtcclxuXHRcdHRoaXMucmVmcmVzaFZpZXcoRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmNoYW5nZVBhc3N3b3JkKTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9uUGFuZU1lbnUobWVudTogTWVudSwgc291cmNlOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdC8vY29uc29sZS5kZWJ1Zygge21lbnUsIHNvdXJjZSwgJ3ZpZXcnOiB0aGlzLmN1cnJlbnRWaWV3fSk7XHJcblx0XHRpZiAoIHNvdXJjZSA9PSAndGFiLWhlYWRlcicgJiYgdGhpcy5jdXJyZW50VmlldyA9PSBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXdTdGF0ZUVudW0uZWRpdE5vdGUgKXtcclxuXHRcdFx0bWVudS5hZGRJdGVtKCBtID0+e1xyXG5cdFx0XHRcdG1cclxuXHRcdFx0XHRcdC5zZXRTZWN0aW9uKCdhY3Rpb24nKVxyXG5cdFx0XHRcdFx0LnNldEljb24oJ2xvY2snKVxyXG5cdFx0XHRcdFx0LnNldFRpdGxlKCdMb2NrJylcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCAoKSA9PiB0aGlzLmFjdGlvbkxvY2tGaWxlKCkgKVxyXG5cdFx0XHRcdDtcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1lbnUuYWRkSXRlbSggbSA9PntcclxuXHRcdFx0XHRtXHJcblx0XHRcdFx0XHQuc2V0U2VjdGlvbignYWN0aW9uJylcclxuXHRcdFx0XHRcdC5zZXRJY29uKCdrZXknKVxyXG5cdFx0XHRcdFx0LnNldFRpdGxlKCdDaGFuZ2UgUGFzc3dvcmQnKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soICgpID0+IHRoaXMuYWN0aW9uQ2hhbmdlUGFzc3dvcmQoKSApXHJcblx0XHRcdFx0O1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHN1cGVyLm9uUGFuZU1lbnUobWVudSxzb3VyY2UpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVUaXRsZSggdGl0bGU6c3RyaW5nICkgOiBIVE1MRWxlbWVudHtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHR0ZXh0IDogYPCflJAgJHt0aXRsZX0g8J+UkGAsXHJcblx0XHRcdGF0dHIgOiB7XHJcblx0XHRcdCBcdHN0eWxlOiAnbWFyZ2luLWJvdHRvbToyZW07J1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdmFsaWRhdGVQYXNzd29yZCAoIHB3OiBzdHJpbmcgKSA6IHN0cmluZyB7XHJcblx0XHRpZiAocHcubGVuZ3RoID09IDApe1xyXG5cdFx0XHRyZXR1cm4gJ1Bhc3N3b3JkIGlzIHRvbyBzaG9ydCc7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gJyc7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHZhbGlkYXRlQ29uZmlybSAoIHB3OiBzdHJpbmcsIGNwdzogc3RyaW5nICkgOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgcGFzc3dvcmRNYXRjaCA9IHB3ID09PSBjcHc7XHJcblx0XHRyZXR1cm4gcGFzc3dvcmRNYXRjaCA/ICcnIDonUGFzc3dvcmQgZG9lc25cXCd0IG1hdGNoJztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlTmV3Tm90ZVZpZXcoKSA6IEhUTUxFbGVtZW50IHtcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygnY3JlYXRlRGVjcnlwdE5vdGVWaWV3JywgeyBcImhpbnRcIjogdGhpcy5oaW50fSApO1xyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gdGhpcy5jcmVhdGVJbnB1dENvbnRhaW5lcigpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcclxuXHRcdFx0LnNldERlc2MoJ1BsZWFzZSBwcm92aWRlIGEgcGFzc3dvcmQgYW5kIGhpbnQgdG8gc3RhcnQgZWRpdGluZyB0aGlzIG5vdGUuJylcclxuXHRcdDtcclxuXHJcblx0XHRjb25zdCBzdWJtaXQgPSBhc3luYyAocGFzc3dvcmQ6IHN0cmluZywgY29uZmlybTogc3RyaW5nLCBoaW50OnN0cmluZykgPT4ge1xyXG5cdFx0XHR2YXIgdmFsaWRQdyA9IHRoaXMudmFsaWRhdGVQYXNzd29yZChwYXNzd29yZCk7XHJcblx0XHRcdHZhciB2YWxpZENwdyA9IHRoaXMudmFsaWRhdGVDb25maXJtKHBhc3N3b3JkLCBjb25maXJtKTtcclxuXHRcdFx0c1Bhc3N3b3JkLnNldERlc2MoIHZhbGlkUHcgKTtcclxuXHRcdFx0c0NvbmZpcm0uc2V0RGVzYyggdmFsaWRDcHcgKTtcclxuXHJcblx0XHRcdGlmICggdmFsaWRQdy5sZW5ndGggPT09IDAgJiYgdmFsaWRDcHcubGVuZ3RoID09PSAwICl7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly9zZXQgcGFzc3dvcmQgYW5kIGhpbnQgYW5kIG9wZW4gbm90ZVxyXG5cdFx0XHRcdHRoaXMuZW5jcnlwdGlvblBhc3N3b3JkID0gcGFzc3dvcmQ7XHJcblx0XHRcdFx0dGhpcy5oaW50ID0gaGludDtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRFZGl0b3JUZXh0ID0gdGhpcy5maWxlLmJhc2VuYW1lO1xyXG5cclxuXHRcdFx0XHRhd2FpdCB0aGlzLmVuY29kZUFuZFNhdmUoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRTZXNzaW9uUGFzc3dvcmRTZXJ2aWNlLnB1dCggeyBwYXNzd29yZDogcGFzc3dvcmQsIGhpbnQ6IGhpbnQgfSwgdGhpcy5maWxlICk7XHJcblxyXG5cdFx0XHRcdHRoaXMucmVmcmVzaFZpZXcoRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmVkaXROb3RlKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBiZXN0R3Vlc3NQYXNzQW5kSGludCA9IFNlc3Npb25QYXNzd29yZFNlcnZpY2UuZ2V0QmVzdEd1ZXNzKCB0aGlzLmZpbGUgKTtcclxuXHRcdGxldCBwYXNzd29yZCA9IGJlc3RHdWVzc1Bhc3NBbmRIaW50LnBhc3N3b3JkO1xyXG5cdFx0bGV0IGNvbmZpcm0gPSAnJztcclxuXHRcdGxldCBoaW50ID0gYmVzdEd1ZXNzUGFzc0FuZEhpbnQuaGludDtcclxuXHJcblx0XHRjb25zdCBzUGFzc3dvcmQgPSBVaUhlbHBlci5idWlsZFBhc3N3b3JkU2V0dGluZyh7XHJcblx0XHRcdGNvbnRhaW5lcixcclxuXHRcdFx0bmFtZTonUGFzc3dvcmQ6JyxcclxuXHRcdFx0YXV0b0ZvY3VzIDogdHJ1ZSxcclxuXHRcdFx0aW5pdGlhbFZhbHVlOiBwYXNzd29yZCxcclxuXHRcdFx0b25DaGFuZ2VDYWxsYmFjazogKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0cGFzc3dvcmQgPSB2YWx1ZTtcclxuXHRcdFx0XHRzUGFzc3dvcmQuc2V0RGVzYyggdGhpcy52YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkKSApO1xyXG5cdFx0XHRcdHNDb25maXJtLnNldERlc2MoIHRoaXMudmFsaWRhdGVDb25maXJtKHBhc3N3b3JkLCBjb25maXJtKSApO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbkVudGVyQ2FsbGJhY2s6ICh2YWx1ZSk9PntcclxuXHRcdFx0XHRwYXNzd29yZCA9IHZhbHVlO1xyXG5cdFx0XHRcdGlmIChwYXNzd29yZC5sZW5ndGggPiAwKXtcclxuXHRcdFx0XHRcdHNDb25maXJtLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpLmZvY3VzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBzQ29uZmlybSA9IFVpSGVscGVyLmJ1aWxkUGFzc3dvcmRTZXR0aW5nKHtcclxuXHRcdFx0Y29udGFpbmVyLFxyXG5cdFx0XHRuYW1lOidDb25maXJtOicsXHJcblx0XHRcdGF1dG9Gb2N1cyA6IGZhbHNlLFxyXG5cdFx0XHRvbkNoYW5nZUNhbGxiYWNrOiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRjb25maXJtID0gdmFsdWU7XHJcblx0XHRcdFx0c1Bhc3N3b3JkLnNldERlc2MoIHRoaXMudmFsaWRhdGVQYXNzd29yZChwYXNzd29yZCkgKTtcclxuXHRcdFx0XHRzQ29uZmlybS5zZXREZXNjKCB0aGlzLnZhbGlkYXRlQ29uZmlybShwYXNzd29yZCwgY29uZmlybSkgKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25FbnRlckNhbGxiYWNrOiAodmFsdWUpID0+e1xyXG5cdFx0XHRcdGNvbmZpcm0gPSB2YWx1ZTtcclxuXHRcdFx0XHRjb25zdCBwYXNzd29yZE1hdGNoID0gcGFzc3dvcmQgPT09IGNvbmZpcm07XHJcblx0XHRcdFx0aWYgKHBhc3N3b3JkTWF0Y2gpe1xyXG5cdFx0XHRcdFx0c0hpbnQuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0JykuZm9jdXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNIaW50ID0gbmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuc2V0TmFtZShcIkhpbnQ6XCIpXHJcblx0XHRcdC5hZGRUZXh0KCh0YykgPT57XHJcblx0XHRcdFx0dGMuc2V0VmFsdWUoaGludCk7XHJcblx0XHRcdFx0dGMub25DaGFuZ2UoIHYgPT4ge1xyXG5cdFx0XHRcdFx0aGludCA9IHY7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0XHRzSGludC5jb250cm9sRWwub24oJ2tleWRvd24nLCAnKicsIChldikgPT57XHJcblx0XHRcdGlmICggZXYua2V5ID09PSAnRW50ZXInICkge1xyXG5cdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0c3VibWl0KHBhc3N3b3JkLCBjb25maXJtLCBoaW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHQuYWRkQnV0dG9uKCBiYyA9PiB7XHJcblx0XHRcdFx0YmNcclxuXHRcdFx0XHRcdC5zZXRDdGEoKVxyXG5cdFx0XHRcdFx0LnNldEljb24oJ2dvLXRvLWZpbGUnKVxyXG5cdFx0XHRcdFx0LnNldFRvb2x0aXAoJ0VkaXQnKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soIChldikgPT4gc3VibWl0KHBhc3N3b3JkLCBjb25maXJtLCBoaW50KSApXHJcblx0XHRcdFx0O1xyXG5cdFx0XHR9KVxyXG5cdFx0O1xyXG5cclxuXHRcdHJldHVybiBjb250YWluZXI7XHJcblx0fVxyXG5cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVEZWNyeXB0Tm90ZVZpZXcoKSA6IEhUTUxFbGVtZW50IHtcclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY3JlYXRlSW5wdXRDb250YWluZXIoKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXREZXNjKCdQbGVhc2UgcHJvdmlkZSBhIHBhc3N3b3JkIHRvIHVubG9jayB0aGlzIG5vdGUuJylcclxuXHRcdDtcclxuXHJcblx0XHRjb25zdCBiZXN0R3Vlc3NQYXNzQW5kSGludCA9IFNlc3Npb25QYXNzd29yZFNlcnZpY2UuZ2V0QmVzdEd1ZXNzKCB0aGlzLmZpbGUgKTtcclxuXHRcdHRoaXMuZW5jcnlwdGlvblBhc3N3b3JkID0gYmVzdEd1ZXNzUGFzc0FuZEhpbnQucGFzc3dvcmQ7XHJcblxyXG5cdFx0VWlIZWxwZXIuYnVpbGRQYXNzd29yZFNldHRpbmcoe1xyXG5cdFx0XHRjb250YWluZXIsXHJcblx0XHRcdG5hbWU6J1Bhc3N3b3JkOicsXHJcblx0XHRcdGluaXRpYWxWYWx1ZTogdGhpcy5lbmNyeXB0aW9uUGFzc3dvcmQsXHJcblx0XHRcdGF1dG9Gb2N1cyA6IHRydWUsXHJcblx0XHRcdHBsYWNlaG9sZGVyOiB0aGlzLmZvcm1hdEhpbnQodGhpcy5oaW50KSxcclxuXHRcdFx0b25DaGFuZ2VDYWxsYmFjazogKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5lbmNyeXB0aW9uUGFzc3dvcmQgPSB2YWx1ZTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25FbnRlckNhbGxiYWNrOiBhc3luYyAoKSA9PiBhd2FpdCB0aGlzLmhhbmRsZURlY3J5cHRCdXR0b25DbGljaygpXHJcblx0XHR9KTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5hZGRCdXR0b24oIGJjID0+IHtcclxuXHRcdFx0XHRiY1xyXG5cdFx0XHRcdFx0LnNldEN0YSgpXHJcblx0XHRcdFx0XHQuc2V0SWNvbignY2hlY2ttYXJrJylcclxuXHRcdFx0XHRcdC5zZXRUb29sdGlwKCdVbmxvY2sgJiBFZGl0JylcclxuXHRcdFx0XHRcdC5vbkNsaWNrKCAoZXZ0KSA9PiB0aGlzLmhhbmRsZURlY3J5cHRCdXR0b25DbGljaygpIClcclxuXHRcdFx0XHQ7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblxyXG5cdFx0cmV0dXJuIGNvbnRhaW5lcjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZW5jb2RlQW5kU2F2ZSggKXtcclxuXHRcdHRyeXtcclxuXHJcblx0XHRcdC8vY29uc29sZS5kZWJ1ZygnZW5jb2RlQW5kU2F2ZScpO1xyXG5cdFx0XHRcclxuXHRcdFx0dmFyIGZpbGVEYXRhID0gYXdhaXQgRmlsZURhdGFIZWxwZXIuZW5jb2RlKFxyXG5cdFx0XHRcdHRoaXMuZW5jcnlwdGlvblBhc3N3b3JkLFxyXG5cdFx0XHRcdHRoaXMuaGludCxcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRFZGl0b3JUZXh0XHJcblx0XHRcdCk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmRhdGEgPSBKc29uRmlsZUVuY29kaW5nLmVuY29kZShmaWxlRGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnJlcXVlc3RTYXZlKCk7XHJcblx0XHR9IGNhdGNoKGUpe1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xyXG5cdFx0XHRuZXcgTm90aWNlKGUsIDEwMDAwKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlRWRpdG9yVmlldygpIDogSFRNTEVsZW1lbnQge1xyXG5cdFx0Ly9jb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbCgndGV4dGFyZWEnKTtcclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdigpO1xyXG5cdFx0Y29udGFpbmVyLmNvbnRlbnRFZGl0YWJsZSA9ICd0cnVlJztcclxuXHRcdGNvbnRhaW5lci5zdHlsZS5mbGV4R3JvdyA9ICcxJztcclxuXHRcdGNvbnRhaW5lci5zdHlsZS5hbGlnblNlbGYgPSAnc3RyZXRjaCc7XHJcblxyXG5cdFx0Ly9jb250YWluZXIudmFsdWUgPSB0aGlzLmN1cnJlbnRFZGl0b3JUZXh0XHJcblx0XHRjb250YWluZXIuaW5uZXJUZXh0ID0gdGhpcy5jdXJyZW50RWRpdG9yVGV4dDtcclxuXHRcdGNvbnRhaW5lci5mb2N1cygpO1xyXG5cclxuXHRcdGNvbnRhaW5lci5vbignaW5wdXQnLCAnKicsIGFzeW5jIChldiwgdGFyZ2V0KSA9PntcclxuXHRcdFx0Ly9jb25zb2xlLmRlYnVnKCdlZGl0b3IgaW5wdXQnLHtldiwgdGFyZ2V0fSk7XHJcblx0XHRcdC8vdGhpcy5jdXJyZW50RWRpdG9yVGV4dCA9IGNvbnRhaW5lci52YWx1ZTtcclxuXHRcdFx0dGhpcy5jdXJyZW50RWRpdG9yVGV4dCA9IGNvbnRhaW5lci5pbm5lclRleHQ7XHJcblx0XHRcdGF3YWl0IHRoaXMuZW5jb2RlQW5kU2F2ZSgpO1xyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gY29udGFpbmVyO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVJbnB1dENvbnRhaW5lcigpIDogSFRNTEVsZW1lbnR7XHJcblx0XHRyZXR1cm4gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KCB7XHJcblx0XHRcdCdhdHRyJzoge1xyXG5cdFx0XHRcdCdzdHlsZSc6ICd3aWR0aDoxMDAlOyBtYXgtd2lkdGg6NDAwcHg7J1xyXG5cdFx0XHR9XHJcblx0XHR9ICk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUNoYW5nZVBhc3N3b3JkVmlldygpIDogSFRNTEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgY29udGFpbmVyID0gdGhpcy5jcmVhdGVJbnB1dENvbnRhaW5lcigpO1xyXG5cclxuXHRcdGxldCBuZXdQYXNzd29yZCA9ICcnO1xyXG5cdFx0bGV0IGNvbmZpcm0gPSAnJztcclxuXHRcdGxldCBuZXdIaW50ID0gJyc7XHJcblxyXG5cdFx0Y29uc3Qgc3VibWl0ID0gYXN5bmMgKG5ld1Bhc3N3b3JkOiBzdHJpbmcsIGNvbmZpcm06IHN0cmluZywgbmV3SGludDpzdHJpbmcpID0+IHtcclxuXHRcdFx0dmFyIHZhbGlkUHcgPSB0aGlzLnZhbGlkYXRlUGFzc3dvcmQobmV3UGFzc3dvcmQpO1xyXG5cdFx0XHR2YXIgdmFsaWRDcHcgPSB0aGlzLnZhbGlkYXRlQ29uZmlybShuZXdQYXNzd29yZCwgY29uZmlybSk7XHJcblx0XHRcdHNOZXdQYXNzd29yZC5zZXREZXNjKCB2YWxpZFB3ICk7XHJcblx0XHRcdHNDb25maXJtLnNldERlc2MoIHZhbGlkQ3B3ICk7XHJcblxyXG5cdFx0XHRpZiAoIHZhbGlkUHcubGVuZ3RoID09PSAwICYmIHZhbGlkQ3B3Lmxlbmd0aCA9PT0gMCApe1xyXG5cdFx0XHRcdC8vc2V0IHBhc3N3b3JkIGFuZCBoaW50IGFuZCBvcGVuIG5vdGVcclxuXHRcdFx0XHQvL2NvbnNvbGUuZGVidWcoJ2NyZWF0ZUNoYW5nZVBhc3N3b3JkVmlldyBzdWJtaXQnKTtcclxuXHRcdFx0XHR0aGlzLmVuY3J5cHRpb25QYXNzd29yZCA9IG5ld1Bhc3N3b3JkO1xyXG5cdFx0XHRcdHRoaXMuaGludCA9IG5ld0hpbnQ7XHJcblxyXG5cdFx0XHRcdHRoaXMuZW5jb2RlQW5kU2F2ZSgpO1xyXG5cdFx0XHRcdHRoaXMucmVmcmVzaFZpZXcoIEVuY3J5cHRlZEZpbGVDb250ZW50Vmlld1N0YXRlRW51bS5lZGl0Tm90ZSApO1xyXG5cdFx0XHRcdG5ldyBOb3RpY2UoJ1Bhc3N3b3JkIGFuZCBIaW50IHdlcmUgY2hhbmdlZCcpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgc05ld1Bhc3N3b3JkID0gVWlIZWxwZXIuYnVpbGRQYXNzd29yZFNldHRpbmcoe1xyXG5cdFx0XHRjb250YWluZXIsXHJcblx0XHRcdG5hbWU6ICdOZXcgUGFzc3dvcmQ6JyxcclxuXHRcdFx0YXV0b0ZvY3VzOiB0cnVlLFxyXG5cdFx0XHRvbkNoYW5nZUNhbGxiYWNrOiAodmFsdWUpID0+e1xyXG5cdFx0XHRcdG5ld1Bhc3N3b3JkID0gdmFsdWU7XHJcblx0XHRcdFx0c05ld1Bhc3N3b3JkLnNldERlc2MoIHRoaXMudmFsaWRhdGVQYXNzd29yZChuZXdQYXNzd29yZCkgKTtcclxuXHRcdFx0XHRzQ29uZmlybS5zZXREZXNjKCB0aGlzLnZhbGlkYXRlQ29uZmlybShuZXdQYXNzd29yZCwgY29uZmlybSkgKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25FbnRlckNhbGxiYWNrOiAodmFsdWUpID0+e1xyXG5cdFx0XHRcdG5ld1Bhc3N3b3JkID0gdmFsdWU7XHJcblx0XHRcdFx0aWYgKG5ld1Bhc3N3b3JkLmxlbmd0aCA+IDApe1xyXG5cdFx0XHRcdFx0c0NvbmZpcm0uY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0JykuZm9jdXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHNDb25maXJtID0gVWlIZWxwZXIuYnVpbGRQYXNzd29yZFNldHRpbmcoe1xyXG5cdFx0XHRjb250YWluZXIsXHJcblx0XHRcdG5hbWU6ICdDb25maXJtOicsXHJcblx0XHRcdG9uQ2hhbmdlQ2FsbGJhY2s6ICh2YWx1ZSkgPT57XHJcblx0XHRcdFx0Y29uZmlybSA9IHZhbHVlO1xyXG5cdFx0XHRcdHNOZXdQYXNzd29yZC5zZXREZXNjKCB0aGlzLnZhbGlkYXRlUGFzc3dvcmQobmV3UGFzc3dvcmQpICk7XHJcblx0XHRcdFx0c0NvbmZpcm0uc2V0RGVzYyggdGhpcy52YWxpZGF0ZUNvbmZpcm0obmV3UGFzc3dvcmQsIGNvbmZpcm0pICk7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uRW50ZXJDYWxsYmFjazogKHZhbHVlKSA9PntcclxuXHRcdFx0XHRjb25maXJtID0gdmFsdWU7XHJcblx0XHRcdFx0Ly8gdmFsaWRhdGUgY29uZmlybVxyXG5cdFx0XHRcdGNvbnN0IHBhc3N3b3JkTWF0Y2ggPSBuZXdQYXNzd29yZCA9PT0gY29uZmlybTtcclxuXHRcdFx0XHRpZiAocGFzc3dvcmRNYXRjaCl7XHJcblx0XHRcdFx0XHRzSGludC5jb250cm9sRWwucXVlcnlTZWxlY3RvcignaW5wdXQnKS5mb2N1cygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3Qgc0hpbnQgPSBuZXcgU2V0dGluZyhjb250YWluZXIpXHJcblx0XHRcdC5zZXROYW1lKFwiTmV3IEhpbnQ6XCIpXHJcblx0XHRcdC5hZGRUZXh0KCh0YykgPT57XHJcblx0XHRcdFx0dGMub25DaGFuZ2UoIHYgPT4ge1xyXG5cdFx0XHRcdFx0bmV3SGludCA9IHY7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0XHRzSGludC5jb250cm9sRWwub24oJ2tleWRvd24nLCAnKicsIChldikgPT57XHJcblx0XHRcdGlmICggZXYua2V5ID09PSAnRW50ZXInICkge1xyXG5cdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0c3VibWl0KG5ld1Bhc3N3b3JkLCBjb25maXJtLCBuZXdIaW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyKVxyXG5cdFx0XHRcdC5hZGRCdXR0b24oIGJjID0+IHtcclxuXHRcdFx0XHRiY1xyXG5cdFx0XHRcdFx0LnJlbW92ZUN0YSgpXHJcblx0XHRcdFx0XHQuc2V0SWNvbignY3Jvc3MnKVxyXG5cdFx0XHRcdFx0Ly8uc2V0QnV0dG9uVGV4dCgnQ2FuY2VsJylcclxuXHRcdFx0XHRcdC5zZXRUb29sdGlwKCdDYW5jZWwnKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soICgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWZyZXNoVmlldyggRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmVkaXROb3RlICk7XHJcblx0XHRcdFx0XHR9IClcclxuXHRcdFx0XHQ7XHJcblx0XHRcdH0pLmFkZEJ1dHRvbiggYmMgPT4ge1xyXG5cdFx0XHRcdGJjXHJcblx0XHRcdFx0XHQuc2V0Q3RhKClcclxuXHRcdFx0XHRcdC5zZXRJY29uKCdjaGVja21hcmsnKVxyXG5cdFx0XHRcdFx0LnNldFRvb2x0aXAoJ0NoYW5nZSBQYXNzd29yZCcpXHJcblx0XHRcdFx0XHQvLy5zZXRCdXR0b25UZXh0KCdDaGFuZ2UgUGFzc3dvcmQnKVxyXG5cdFx0XHRcdFx0LnNldFdhcm5pbmcoKVxyXG5cdFx0XHRcdFx0Lm9uQ2xpY2soIChldikgPT4ge1xyXG5cdFx0XHRcdFx0XHRzdWJtaXQobmV3UGFzc3dvcmQsIGNvbmZpcm0sIG5ld0hpbnQpO1xyXG5cdFx0XHRcdFx0fSApXHJcblx0XHRcdFx0O1xyXG5cdFx0XHR9KVxyXG5cdFx0O1xyXG5cclxuXHRcdHJldHVybiBjb250YWluZXI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdEhpbnQoIGhpbnQ6c3RyaW5nICk6IHN0cmluZ3tcclxuXHRcdGlmIChoaW50Lmxlbmd0aCA+IDApe1xyXG5cdFx0XHRyZXR1cm4gYEhpbnQ6ICR7aGludH1gO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVmcmVzaFZpZXcoXHJcblx0XHRuZXdWaWV3OiBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXdTdGF0ZUVudW1cclxuXHQpe1xyXG5cdFx0XHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ3JlZnJlc2hWaWV3Jyx7J2N1cnJlbnRWaWV3Jzp0aGlzLmN1cnJlbnRWaWV3LCBuZXdWaWV3fSk7XHJcblxyXG5cdFx0dGhpcy5lbEFjdGlvbkljb25Mb2NrTm90ZS5oaWRlKCk7XHJcblx0XHR0aGlzLmVsQWN0aW9uQ2hhbmdlUGFzc3dvcmQuaGlkZSgpO1xyXG5cclxuXHRcdC8vIGNsZWFyIHZpZXdcclxuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcblxyXG5cdFx0dGhpcy5jdXJyZW50VmlldyA9IG5ld1ZpZXc7XHJcblxyXG5cdFx0c3dpdGNoICh0aGlzLmN1cnJlbnRWaWV3KSB7XHJcblx0XHRcdGNhc2UgRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLm5ld05vdGU6XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVUaXRsZSgnVGhpcyBub3RlIHdpbGwgYmUgZW5jcnlwdGVkJyk7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVOZXdOb3RlVmlldygpO1xyXG5cdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmRlY3J5cHROb3RlOlxyXG5cdFx0XHRcdHRoaXMuY3JlYXRlVGl0bGUoJ1RoaXMgbm90ZSBpcyBlbmNyeXB0ZWQnKTtcclxuXHRcdFx0XHR0aGlzLmNyZWF0ZURlY3J5cHROb3RlVmlldygpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdFx0XHJcblx0XHRcdGNhc2UgRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmVkaXROb3RlOlxyXG5cdFx0XHRcdHRoaXMuZWxBY3Rpb25JY29uTG9ja05vdGUuc2hvdygpO1xyXG5cdFx0XHRcdHRoaXMuZWxBY3Rpb25DaGFuZ2VQYXNzd29yZC5zaG93KCk7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVUaXRsZSgnVGhpcyBub3RlIGlzIGVuY3J5cHRlZCcpO1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlRWRpdG9yVmlldygpO1xyXG5cdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3U3RhdGVFbnVtLmNoYW5nZVBhc3N3b3JkOlxyXG5cdFx0XHRcdHRoaXMuY3JlYXRlVGl0bGUoJ0NoYW5nZSBlbmNyeXB0ZWQgbm90ZSBwYXNzd29yZCcpO1xyXG5cdFx0XHRcdHRoaXMuY3JlYXRlQ2hhbmdlUGFzc3dvcmRWaWV3KCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHR9XHJcblxyXG5cdGFzeW5jIGhhbmRsZURlY3J5cHRCdXR0b25DbGljaygpIHtcclxuXHRcdHZhciBmaWxlRGF0YSA9IEpzb25GaWxlRW5jb2RpbmcuZGVjb2RlKHRoaXMuZGF0YSlcclxuXHRcdFx0XHRcdFx0XHJcblx0XHQvL2NvbnNvbGUuZGVidWcoJ0RlY3J5cHQgYnV0dG9uJywgZmlsZURhdGEpO1xyXG5cclxuXHRcdGNvbnN0IGRlY3J5cHRlZFRleHQgPSBhd2FpdCBGaWxlRGF0YUhlbHBlci5kZWNyeXB0KFxyXG5cdFx0XHRmaWxlRGF0YSxcclxuXHRcdFx0dGhpcy5lbmNyeXB0aW9uUGFzc3dvcmRcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKGRlY3J5cHRlZFRleHQgPT09IG51bGwpe1xyXG5cdFx0XHRuZXcgTm90aWNlKCdEZWNyeXB0aW9uIGZhaWxlZCcpO1xyXG5cdFx0fWVsc2V7XHJcblx0XHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2UucHV0KCB7cGFzc3dvcmQ6IHRoaXMuZW5jcnlwdGlvblBhc3N3b3JkLCBoaW50OiB0aGlzLmhpbnQgfSwgdGhpcy5maWxlICk7XHJcblx0XHRcdHRoaXMuY3VycmVudEVkaXRvclRleHQgPSBkZWNyeXB0ZWRUZXh0O1xyXG5cdFx0XHR0aGlzLnJlZnJlc2hWaWV3KCBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXdTdGF0ZUVudW0uZWRpdE5vdGUpO1xyXG5cdFx0fVxyXG5cclxuXHR9XHJcblxyXG5cdC8vIGltcG9ydGFudFxyXG5cdGNhbkFjY2VwdEV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly9jb25zb2xlLmRlYnVnKCdFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXcuY2FuQWNjZXB0RXh0ZW5zaW9uJywge2V4dGVuc2lvbn0pO1xyXG5cdFx0cmV0dXJuIGV4dGVuc2lvbiA9PSAnZW5jcnlwdGVkJztcclxuXHR9XHJcblxyXG5cdC8vIGltcG9ydGFudFxyXG5cdGdldFZpZXdUeXBlKCkge1xyXG5cdFx0cmV0dXJuIFZJRVdfVFlQRV9FTkNSWVBURURfRklMRV9DT05URU5UO1xyXG5cdH1cclxuXHJcblx0Ly8gdGhlIGRhdGEgdG8gc2hvdyBvbiB0aGUgdmlld1xyXG5cdG92ZXJyaWRlIHNldFZpZXdEYXRhKGRhdGE6IHN0cmluZywgY2xlYXI6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdC8vIGNvbnNvbGUuZGVidWcoJ0VuY3J5cHRlZEZpbGVDb250ZW50Vmlldy5zZXRWaWV3RGF0YScsIHtcclxuXHRcdC8vIFx0ZGF0YSxcclxuXHRcdC8vIFx0Y2xlYXIsXHJcblx0XHQvLyBcdCdwYXNzJzp0aGlzLmVuY3J5cHRpb25QYXNzd29yZCxcclxuXHRcdC8vIFx0Ly8nbW9kZSc6dGhpcy5nZXRNb2RlKCksXHJcblx0XHQvLyBcdC8vJ21vZGUtZGF0YSc6dGhpcy5jdXJyZW50TW9kZS5nZXQoKSxcclxuXHRcdC8vIFx0Ly8ncHJldmlldy1tb2RlLWRhdGEnOnRoaXMucHJldmlld01vZGUuZ2V0KClcclxuXHRcdC8vIH0pO1xyXG5cclxuXHRcdGlmIChjbGVhcil7XHJcblxyXG5cdFx0XHR2YXIgbmV3VmlldyA6IEVuY3J5cHRlZEZpbGVDb250ZW50Vmlld1N0YXRlRW51bTtcclxuXHRcdFx0aWYgKGRhdGEgPT09ICcnKXtcclxuXHRcdFx0XHQvLyBibGFuayBuZXcgZmlsZVxyXG5cdFx0XHRcdG5ld1ZpZXcgPSBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXdTdGF0ZUVudW0ubmV3Tm90ZTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0bmV3VmlldyA9IEVuY3J5cHRlZEZpbGVDb250ZW50Vmlld1N0YXRlRW51bS5kZWNyeXB0Tm90ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gbmV3IGZpbGUsIHdlIGRvbid0IGtub3cgd2hhdCB0aGUgcGFzc3dvcmQgaXMgeWV0XHJcblx0XHRcdHRoaXMuZW5jcnlwdGlvblBhc3N3b3JkID0gJyc7XHJcblxyXG5cdFx0XHQvLyBqc29uIGRlY29kZSBmaWxlIGRhdGEgdG8gZ2V0IHRoZSBIaW50XHJcblx0XHRcdHZhciBmaWxlRGF0YSA9IEpzb25GaWxlRW5jb2RpbmcuZGVjb2RlKHRoaXMuZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmhpbnQgPSBmaWxlRGF0YS5oaW50O1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5yZWZyZXNoVmlldyggbmV3VmlldyApO1xyXG5cclxuXHRcdH1lbHNle1xyXG5cdFx0XHR0aGlzLmxlYWYuZGV0YWNoKCk7XHJcblx0XHRcdG5ldyBOb3RpY2UoJ011bHRpcGxlIHZpZXdzIG9mIHRoZSBzYW1lIGVuY3J5cHRlZCBub3RlIGlzblxcJ3Qgc3VwcG9ydGVkJyk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcblxyXG5cdC8vIHRoZSBkYXRhIHRvIHNhdmUgdG8gZGlza1xyXG5cdG92ZXJyaWRlIGdldFZpZXdEYXRhKCk6IHN0cmluZyB7XHJcblx0XHQvLyBjb25zb2xlLmRlYnVnKCdFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXcuZ2V0Vmlld0RhdGEnLCB7XHJcblx0XHQvLyBcdCd0aGlzJzp0aGlzLFxyXG5cdFx0Ly8gXHQnZGF0YSc6dGhpcy5kYXRhLFxyXG5cdFx0Ly8gfSk7XHJcblx0XHRcclxuXHRcdHJldHVybiB0aGlzLmRhdGE7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBjbGVhcigpOiB2b2lkIHtcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygnRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3LmNsZWFyJyk7XHJcblx0fVxyXG5cclxuXHJcbn1cclxuXHJcbmNsYXNzIEZpbGVEYXRhe1xyXG5cdFxyXG5cdHB1YmxpYyB2ZXJzaW9uIDogc3RyaW5nID0gXCIxLjBcIjtcclxuXHRwdWJsaWMgaGludDogc3RyaW5nO1xyXG5cdHB1YmxpYyBlbmNvZGVkRGF0YTpzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKCBoaW50OnN0cmluZywgZW5jb2RlZERhdGE6c3RyaW5nICl7XHJcblx0XHR0aGlzLmhpbnQgPSBoaW50O1xyXG5cdFx0dGhpcy5lbmNvZGVkRGF0YSA9IGVuY29kZWREYXRhO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgRmlsZURhdGFIZWxwZXJ7XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgYXN5bmMgZW5jb2RlKCBwYXNzOiBzdHJpbmcsIGhpbnQ6c3RyaW5nLCB0ZXh0OnN0cmluZyApIDogUHJvbWlzZTxGaWxlRGF0YT57XHJcblx0XHRjb25zdCBjcnlwdG8gPSBuZXcgQ3J5cHRvSGVscGVyKCk7XHJcblx0XHRjb25zdCBlbmNyeXB0ZWREYXRhID0gYXdhaXQgY3J5cHRvLmVuY3J5cHRUb0Jhc2U2NCh0ZXh0LCBwYXNzKTtcclxuXHRcdHJldHVybiBuZXcgRmlsZURhdGEoaGludCwgZW5jcnlwdGVkRGF0YSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGFzeW5jIGRlY3J5cHQoIGRhdGE6IEZpbGVEYXRhLCBwYXNzOnN0cmluZyApIDogUHJvbWlzZTxzdHJpbmc+e1xyXG5cdFx0aWYgKCBkYXRhLmVuY29kZWREYXRhID09ICcnICl7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH1cclxuXHRcdGNvbnN0IGNyeXB0byA9IG5ldyBDcnlwdG9IZWxwZXIoKTtcclxuXHRcdHJldHVybiBhd2FpdCBjcnlwdG8uZGVjcnlwdEZyb21CYXNlNjQoZGF0YS5lbmNvZGVkRGF0YSwgcGFzcyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBKc29uRmlsZUVuY29kaW5nIHtcclxuXHJcblx0cHVibGljIHN0YXRpYyBlbmNvZGUoIGRhdGE6IEZpbGVEYXRhICkgOiBzdHJpbmd7XHJcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc3RhdGljIGRlY29kZSggZW5jb2RlZFRleHQ6c3RyaW5nICkgOiBGaWxlRGF0YXtcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygnSnNvbkZpbGVFbmNvZGluZy5kZWNvZGUnLHtlbmNvZGVkVGV4dH0pO1xyXG5cdFx0aWYgKGVuY29kZWRUZXh0ID09PSAnJyl7XHJcblx0XHRcdHJldHVybiBuZXcgRmlsZURhdGEoIFwiXCIsIFwiXCIgKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBKU09OLnBhcnNlKGVuY29kZWRUZXh0KSBhcyBGaWxlRGF0YTtcclxuXHR9XHJcbn0iLCJpbXBvcnQgeyBub3JtYWxpemVQYXRoLCBtb21lbnQsIE5vdGljZSwgVEZvbGRlciwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBFbmNyeXB0ZWRGaWxlQ29udGVudFZpZXcsIFZJRVdfVFlQRV9FTkNSWVBURURfRklMRV9DT05URU5UIH0gZnJvbSBcIi4vRW5jcnlwdGVkRmlsZUNvbnRlbnRWaWV3XCI7XHJcbmltcG9ydCB7IElNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmUgfSBmcm9tIFwiLi4vSU1lbGRFbmNyeXB0UGx1Z2luRmVhdHVyZVwiO1xyXG5pbXBvcnQgTWVsZEVuY3J5cHQgZnJvbSBcIi4uLy4uL21haW5cIjtcclxuaW1wb3J0IHsgSU1lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3MgfSBmcm9tIFwiLi4vLi4vc2V0dGluZ3MvTWVsZEVuY3J5cHRQbHVnaW5TZXR0aW5nc1wiO1xyXG5pbXBvcnQgeyBJRmVhdHVyZVdob2xlTm90ZUVuY3J5cHRTZXR0aW5ncyB9IGZyb20gXCIuL0lGZWF0dXJlV2hvbGVOb3RlRW5jcnlwdFNldHRpbmdzXCI7XHJcbmltcG9ydCB7IFVpSGVscGVyIH0gZnJvbSBcIi4uLy4uL3NlcnZpY2VzL1VpSGVscGVyXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGZWF0dXJlV2hvbGVOb3RlRW5jcnlwdCBpbXBsZW1lbnRzIElNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmUge1xyXG5cclxuXHRwbHVnaW46TWVsZEVuY3J5cHQ7XHJcblx0c2V0dGluZ3M6IElGZWF0dXJlV2hvbGVOb3RlRW5jcnlwdFNldHRpbmdzO1xyXG5cclxuXHRwcml2YXRlIHJpYmJvbkljb25DcmVhdGVOZXdOb3RlPzogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdGFzeW5jIG9ubG9hZCggcGx1Z2luOiBNZWxkRW5jcnlwdCwgc2V0dGluZ3M6SU1lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3MgKSB7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncy5mZWF0dXJlV2hvbGVOb3RlRW5jcnlwdDtcclxuXHRcdHRoaXMudXBkYXRlVWlGb3JTZXR0aW5ncygpO1xyXG5cdFx0XHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3RlclZpZXcoXHJcblx0XHRcdFZJRVdfVFlQRV9FTkNSWVBURURfRklMRV9DT05URU5ULFxyXG5cdFx0XHQobGVhZikgPT4gbmV3IEVuY3J5cHRlZEZpbGVDb250ZW50VmlldyhsZWFmKVxyXG5cdFx0KTtcclxuXHRcdFx0XHJcblx0XHR0aGlzLnBsdWdpbi5yZWdpc3RlckV4dGVuc2lvbnMoWydlbmNyeXB0ZWQnXSwgVklFV19UWVBFX0VOQ1JZUFRFRF9GSUxFX0NPTlRFTlQpO1xyXG5cdFx0XHRcclxuXHRcdHRoaXMucGx1Z2luLmFkZENvbW1hbmQoe1xyXG5cdFx0XHRpZDogJ21lbGQtZW5jcnlwdC1jcmVhdGUtbmV3LW5vdGUnLFxyXG5cdFx0XHRuYW1lOiAnQ3JlYXRlIG5ldyBlbmNyeXB0ZWQgbm90ZScsXHJcblx0XHRcdGljb246ICdsb2NrJyxcclxuXHRcdFx0Y2hlY2tDYWxsYmFjazogKGNoZWNraW5nKSA9PiB0aGlzLnByb2Nlc3NDcmVhdGVOZXdFbmNyeXB0ZWROb3RlQ29tbWFuZChjaGVja2luZylcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9FTkNSWVBURURfRklMRV9DT05URU5UKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcHJvY2Vzc0NyZWF0ZU5ld0VuY3J5cHRlZE5vdGVDb21tYW5kKGNoZWNraW5nOiBib29sZWFuKTogYm9vbGVhbntcclxuXHRcdC8vY29uc29sZS5kZWJ1ZygncHJvY2Vzc0NyZWF0ZU5ld0VuY3J5cHRlZE5vdGVDb21tYW5kJywge2NoZWNraW5nfSk7XHJcblx0XHR0cnl7XHJcblx0XHRcdGlmIChjaGVja2luZyB8fCBVaUhlbHBlci5pc1NldHRpbmdzTW9kYWxPcGVuKCkpe1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRsZXQgbmV3RmlsZW5hbWUgPSBtb21lbnQoKS5mb3JtYXQoJ1tVbnRpdGxlZF0gWVlZWU1NREQgaGhtbXNzWy5lbmNyeXB0ZWRdJyk7IFxyXG5cdFx0XHRcclxuXHRcdFx0bGV0IG5ld0ZpbGVGb2xkZXIgOiBURm9sZGVyO1xyXG5cdFx0XHRjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcblxyXG5cdFx0XHRpZiAoYWN0aXZlRmlsZSAhPSBudWxsKXtcclxuXHRcdFx0XHRuZXdGaWxlRm9sZGVyID0gdGhpcy5wbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLmdldE5ld0ZpbGVQYXJlbnQoYWN0aXZlRmlsZS5wYXRoKTtcclxuXHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0bmV3RmlsZUZvbGRlciA9IHRoaXMucGx1Z2luLmFwcC5maWxlTWFuYWdlci5nZXROZXdGaWxlUGFyZW50KCcnKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgbmV3RmlsZXBhdGggPSBub3JtYWxpemVQYXRoKCBuZXdGaWxlRm9sZGVyLnBhdGggKyBcIi9cIiArIG5ld0ZpbGVuYW1lICk7XHJcblx0XHRcdC8vY29uc29sZS5kZWJ1ZygncHJvY2Vzc0NyZWF0ZU5ld0VuY3J5cHRlZE5vdGVDb21tYW5kJywge25ld0ZpbGVwYXRofSk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAudmF1bHQuY3JlYXRlKG5ld0ZpbGVwYXRoLCcnKS50aGVuKCBmPT57XHJcblx0XHRcdFx0Y29uc3QgbGVhZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZiggZmFsc2UgKTtcclxuXHRcdFx0XHRsZWFmLm9wZW5GaWxlKCBmICk7XHJcblx0XHRcdH0pLmNhdGNoKCByZWFzb24gPT57XHJcblx0XHRcdFx0bmV3IE5vdGljZShyZWFzb24sIDEwMDAwKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1jYXRjaChlKXtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcclxuXHRcdFx0bmV3IE5vdGljZShlLCAxMDAwMCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRidWlsZFNldHRpbmdzVWkoXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRzYXZlU2V0dGluZ0NhbGxiYWNrIDogKCkgPT4gUHJvbWlzZTx2b2lkPlxyXG5cdCk6IHZvaWQge1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0SGVhZGluZygpXHJcblx0XHRcdC5zZXROYW1lKCdXaG9sZSBOb3RlIEVuY3J5cHRpb24gU2V0dGluZ3MnKVxyXG5cdFx0O1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSgnQWRkIHJpYmJvbiBpY29uIHRvIGNyZWF0ZSBub3RlJylcclxuXHRcdFx0LnNldERlc2MoJ0FkZHMgYSByaWJib24gaWNvbiB0byB0aGUgbGVmdCBiYXIgdG8gY3JlYXRlIGFuIGVuY3J5cHRlZCBub3RlLicpXHJcblx0XHRcdC5hZGRUb2dnbGUoIHRvZ2dsZSA9PntcclxuXHJcblx0XHRcdFx0dG9nZ2xlXHJcblx0XHRcdFx0XHQuc2V0VmFsdWUodGhpcy5zZXR0aW5ncy5hZGRSaWJib25JY29uVG9DcmVhdGVOb3RlKVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0Lm9uQ2hhbmdlKCBhc3luYyB2YWx1ZSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0dGluZ3MuYWRkUmliYm9uSWNvblRvQ3JlYXRlTm90ZSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBzYXZlU2V0dGluZ0NhbGxiYWNrKCk7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlVWlGb3JTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQ7XHJcblx0XHRcdH0pXHJcblx0XHQ7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdXBkYXRlVWlGb3JTZXR0aW5ncygpe1xyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MuYWRkUmliYm9uSWNvblRvQ3JlYXRlTm90ZSl7XHJcblx0XHRcdC8vIHR1cm4gb24gcmliYm9uIGljb25cclxuXHRcdFx0aWYgKHRoaXMucmliYm9uSWNvbkNyZWF0ZU5ld05vdGUgPT0gbnVsbCl7XHJcblx0XHRcdFx0dGhpcy5yaWJib25JY29uQ3JlYXRlTmV3Tm90ZSA9IHRoaXMucGx1Z2luLmFkZFJpYmJvbkljb24oICdsb2NrJywgJ0NyZWF0ZSBuZXcgZW5jcnlwdGVkIG5vdGUnLCAoZXYpPT57XHJcblx0XHRcdFx0XHR0aGlzLnByb2Nlc3NDcmVhdGVOZXdFbmNyeXB0ZWROb3RlQ29tbWFuZChmYWxzZSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1lbHNle1xyXG5cdFx0XHQvLyB0dXJuIG9mZiByaWJib24gaWNvblxyXG5cdFx0XHRpZiAodGhpcy5yaWJib25JY29uQ3JlYXRlTmV3Tm90ZSAhPSBudWxsKXtcclxuXHRcdFx0XHR0aGlzLnJpYmJvbkljb25DcmVhdGVOZXdOb3RlLnJlbW92ZSgpO1xyXG5cdFx0XHRcdHRoaXMucmliYm9uSWNvbkNyZWF0ZU5ld05vdGUgPSBudWxsO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsImltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IE1lbGRFbmNyeXB0U2V0dGluZ3NUYWIgZnJvbSAnLi9zZXR0aW5ncy9NZWxkRW5jcnlwdFNldHRpbmdzVGFiJztcclxuaW1wb3J0IHsgSU1lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzL01lbGRFbmNyeXB0UGx1Z2luU2V0dGluZ3MnO1xyXG5pbXBvcnQgRmVhdHVyZUlucGxhY2VFbmNyeXB0IGZyb20gJy4vZmVhdHVyZXMvZmVhdHVyZS1pbnBsYWNlLWVuY3J5cHQvRmVhdHVyZUlucGxhY2VFbmNyeXB0JztcclxuaW1wb3J0IEZlYXR1cmVXaG9sZU5vdGVFbmNyeXB0IGZyb20gJy4vZmVhdHVyZXMvZmVhdHVyZS13aG9sZS1ub3RlLWVuY3J5cHQvRmVhdHVyZVdob2xlTm90ZUVuY3J5cHQnO1xyXG5pbXBvcnQgeyBJTWVsZEVuY3J5cHRQbHVnaW5GZWF0dXJlIH0gZnJvbSAnLi9mZWF0dXJlcy9JTWVsZEVuY3J5cHRQbHVnaW5GZWF0dXJlJztcclxuaW1wb3J0IHsgU2Vzc2lvblBhc3N3b3JkU2VydmljZSB9IGZyb20gJy4vc2VydmljZXMvU2Vzc2lvblBhc3N3b3JkU2VydmljZSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNZWxkRW5jcnlwdCBleHRlbmRzIFBsdWdpbiB7XHJcblxyXG5cdHByaXZhdGUgc2V0dGluZ3M6IElNZWxkRW5jcnlwdFBsdWdpblNldHRpbmdzO1xyXG5cclxuXHRwcml2YXRlIGVuYWJsZWRGZWF0dXJlcyA6IElNZWxkRW5jcnlwdFBsdWdpbkZlYXR1cmVbXSA9IFtdO1xyXG5cclxuXHRhc3luYyBvbmxvYWQoKSB7XHJcblxyXG5cdFx0Ly8gU2V0dGluZ3NcclxuXHRcdGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XHJcblxyXG5cdFx0XHJcblxyXG5cdFx0dGhpcy5lbmFibGVkRmVhdHVyZXMucHVzaChcclxuXHRcdFx0bmV3IEZlYXR1cmVXaG9sZU5vdGVFbmNyeXB0KCksXHJcblx0XHRcdG5ldyBGZWF0dXJlSW5wbGFjZUVuY3J5cHQoKVxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLmFkZFNldHRpbmdUYWIoXHJcblx0XHRcdG5ldyBNZWxkRW5jcnlwdFNldHRpbmdzVGFiKFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRoaXMsXHJcblx0XHRcdFx0dGhpcy5zZXR0aW5ncyxcclxuXHRcdFx0XHR0aGlzLmVuYWJsZWRGZWF0dXJlc1xyXG5cdFx0XHQpXHJcblx0XHQpO1xyXG5cdFx0Ly8gRW5kIFNldHRpbmdzXHJcblxyXG5cdFx0Ly8gbG9hZCBmZWF0dXJlc1xyXG5cdFx0dGhpcy5lbmFibGVkRmVhdHVyZXMuZm9yRWFjaChhc3luYyBmID0+IHtcclxuXHRcdFx0YXdhaXQgZi5vbmxvYWQoIHRoaXMsIHRoaXMuc2V0dGluZ3MgKTtcclxuXHRcdH0pO1xyXG5cclxuXHR9XHJcblx0XHJcblx0b251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmVuYWJsZWRGZWF0dXJlcy5mb3JFYWNoKGFzeW5jIGYgPT4ge1xyXG5cdFx0XHRmLm9udW5sb2FkKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuXHRcdGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IElNZWxkRW5jcnlwdFBsdWdpblNldHRpbmdzID0ge1xyXG5cdFx0XHRjb25maXJtUGFzc3dvcmQ6IHRydWUsXHJcblx0XHRcdHJlbWVtYmVyUGFzc3dvcmQ6IHRydWUsXHJcblx0XHRcdHJlbWVtYmVyUGFzc3dvcmRUaW1lb3V0OiAzMCxcclxuXHJcblx0XHRcdGZlYXR1cmVXaG9sZU5vdGVFbmNyeXB0OiB7XHJcblx0XHRcdFx0YWRkUmliYm9uSWNvblRvQ3JlYXRlTm90ZTogdHJ1ZSxcclxuXHRcdFx0fSxcclxuXHRcdFx0XHJcblx0XHRcdGZlYXR1cmVJbnBsYWNlRW5jcnlwdDp7XHJcblx0XHRcdFx0ZXhwYW5kVG9XaG9sZUxpbmVzOiBmYWxzZSxcclxuXHRcdFx0XHRzaG93Q29weUJ1dHRvbjogdHJ1ZSxcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKFxyXG5cdFx0XHRERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFx0XHRhd2FpdCB0aGlzLmxvYWREYXRhKClcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYXBwbHkgc2V0dGluZ3NcclxuXHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2Uuc2V0QWN0aXZlKCB0aGlzLnNldHRpbmdzLnJlbWVtYmVyUGFzc3dvcmQgKTtcclxuXHRcdFNlc3Npb25QYXNzd29yZFNlcnZpY2Uuc2V0QXV0b0V4cGlyZShcclxuXHRcdFx0dGhpcy5zZXR0aW5ncy5yZW1lbWJlclBhc3N3b3JkVGltZW91dCA9PSAwXHJcblx0XHRcdD8gbnVsbFxyXG5cdFx0XHQ6IHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQYXNzd29yZFRpbWVvdXRcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBzYXZlU2V0dGluZ3MoKSB7XHJcblx0XHRhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xyXG5cdH1cclxuXHJcbn0iXSwibmFtZXMiOlsiUGx1Z2luU2V0dGluZ1RhYiIsIlNldHRpbmciLCJNb2RhbCIsIk5vdGljZSIsIlRleHRDb21wb25lbnQiLCJUZXh0RmlsZVZpZXciLCJtb21lbnQiLCJub3JtYWxpemVQYXRoIiwiUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXVEQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUUsS0FBSyxDQUFDLENBQUM7QUFDUDs7TUM3RWEsV0FBVyxDQUFBO0FBQXhCLElBQUEsV0FBQSxHQUFBO0FBRVMsUUFBQSxJQUFBLENBQUEsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFZLENBQUM7S0F1Q3JDO0lBckNPLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBUSxFQUFBOztRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxHQUFHLEVBQUUsS0FBSyxDQUFFLENBQUM7S0FDOUI7SUFFTSxHQUFHLENBQUMsR0FBVyxFQUFFLFlBQWUsRUFBQTs7UUFFdEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUM7S0FDbEU7SUFFTSxRQUFRLENBQUMsSUFBYyxFQUFFLFlBQWUsRUFBQTs7QUFHOUMsUUFBQSxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtBQUNqRCxZQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QixZQUFBLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDMUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNuQyxhQUFBO0FBQ0QsU0FBQTtBQUVELFFBQUEsT0FBTyxZQUFZLENBQUM7S0FDcEI7QUFFTSxJQUFBLFdBQVcsQ0FBQyxHQUFXLEVBQUE7O1FBRTdCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDNUI7SUFFTSxPQUFPLEdBQUE7O1FBRWIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUUsQ0FBQztLQUN4QztJQUVNLEtBQUssR0FBQTs7QUFFWCxRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDcEI7QUFDRDs7TUNqQ1ksc0JBQXNCLENBQUE7SUFXM0IsT0FBTyxTQUFTLENBQUUsUUFBaUIsRUFBQTtBQUN6QyxRQUFBLHNCQUFzQixDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDM0MsUUFBQSxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFNBQUE7S0FDRDtBQUVEOzs7QUFHRztJQUNJLE9BQU8sYUFBYSxDQUFFLGVBQXNCLEVBQUE7QUFDbEQsUUFBQSxzQkFBc0IsQ0FBQyxtQkFBbUIsR0FBRyxlQUFlLENBQUM7UUFDN0Qsc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztLQUMxQztBQUVNLElBQUEsT0FBTyxnQkFBZ0IsR0FBQTtBQUM3QixRQUFBLElBQ0Msc0JBQXNCLENBQUMsbUJBQW1CLElBQUksQ0FBQztBQUM1QyxlQUFBLHNCQUFzQixDQUFDLG1CQUFtQixJQUFJLElBQUksRUFDckQ7QUFDQSxZQUFBLHNCQUFzQixDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDekMsU0FBQTtBQUFNLGFBQUE7QUFDTixZQUFBLHNCQUFzQixDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN4RyxTQUFBO0FBQ0QsUUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLEVBQUMsVUFBVSxFQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUM7S0FDekc7QUFFTSxJQUFBLE9BQU8sR0FBRyxDQUFFLEVBQW9CLEVBQUUsSUFBWSxFQUFBO1FBQ3BELE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsRUFBQyxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQTtRQUN2RCxPQUFPLENBQUMsS0FBSyxDQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFFLENBQUM7UUFFbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM5QixRQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbEMsc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztLQUMxQztJQUVNLE9BQU8sUUFBUSxDQUFFLElBQVksRUFBQTtRQUNuQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUMxQyxRQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0tBQzlFO0lBRU0sT0FBTyxZQUFZLENBQUUsSUFBWSxFQUFBO1FBQ3ZDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzs7UUFFdEIsc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUUxQyxRQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUNyQztBQUNDLFlBQUEsSUFBSSxDQUFDLElBQUk7WUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDaEIsWUFBQSxJQUFJLENBQUMsUUFBUTtBQUNiLFNBQUEsRUFDRCxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FDM0MsQ0FBQztRQUNGLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFDLENBQUMsQ0FBQTtBQUV4RSxRQUFBLE9BQU8sVUFBVSxDQUFDO0tBR2xCO0FBRU8sSUFBQSxPQUFPLGNBQWMsR0FBQTtBQUM1QixRQUFBLElBQUssc0JBQXNCLENBQUMsVUFBVSxJQUFJLElBQUksRUFBRTtZQUMvQyxPQUFPO0FBQ1AsU0FBQTtRQUNELElBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRTtZQUNwRCxPQUFPO0FBQ1AsU0FBQTtRQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNiO0FBR00sSUFBQSxPQUFPLEtBQUssR0FBQTtBQUNsQixRQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDbkI7O0FBdkZjLHNCQUFRLENBQUEsUUFBQSxHQUFhLElBQUksQ0FBQztBQUUxQixzQkFBb0IsQ0FBQSxvQkFBQSxHQUFzQixFQUFDLFFBQVEsRUFBQyxFQUFFLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDO0FBRWxFLHNCQUFBLENBQUEsS0FBSyxHQUFHLElBQUksV0FBVyxFQUFvQixDQUFDO0FBRTVDLHNCQUFtQixDQUFBLG1CQUFBLEdBQVUsQ0FBQyxDQUFDO0FBQy9CLHNCQUFVLENBQUEsVUFBQSxHQUFZLElBQUk7O0FDWHJCLE1BQUEsc0JBQXVCLFNBQVFBLHlCQUFnQixDQUFBO0FBTW5FLElBQUEsV0FBQSxDQUNDLEdBQVEsRUFDUixNQUFtQixFQUNuQixRQUFtQyxFQUNuQyxRQUFxQyxFQUFBO0FBRXJDLFFBQUEsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNuQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3JCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDekIsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztLQUN6QjtJQUVELE9BQU8sR0FBQTtBQUNOLFFBQUEsSUFBSSxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQztRQUUzQixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFcEIsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUMsQ0FBQyxDQUFDOztRQUdoRSxJQUFJQyxnQkFBTyxDQUFDLFdBQVcsQ0FBQztBQUN0QixhQUFBLFVBQVUsRUFBRTthQUNaLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzQjtRQUVELElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQzthQUM1QixPQUFPLENBQUMsbUNBQW1DLENBQUM7YUFDNUMsU0FBUyxDQUFFLE1BQU0sSUFBRztZQUNwQixNQUFNO0FBQ0osaUJBQUEsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO0FBQ3ZDLGlCQUFBLFFBQVEsQ0FBRSxDQUFNLEtBQUssS0FBRyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDeEIsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQ3RDLGdCQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQzthQUNqQyxDQUFBLENBQUMsQ0FBQTtBQUNKLFNBQUMsQ0FBQyxDQUNGO1FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxNQUFLO0FBRTdDLFlBQUEsSUFBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUU7QUFDckMsZ0JBQUEsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQyxPQUFPO0FBQ1AsYUFBQTtBQUVELFlBQUEsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0FBRWxDLFlBQUEsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDO0FBRXRFLFlBQUEsSUFBSSxhQUFhLEdBQUcsQ0FBRyxFQUFBLHVCQUF1QixVQUFVLENBQUM7WUFDekQsSUFBSSx1QkFBdUIsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pDLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFDL0IsYUFBQTtBQUVELFlBQUEsZ0JBQWdCLENBQUMsT0FBTyxDQUFFLDhCQUE4QixhQUFhLENBQUEsQ0FBQSxDQUFHLENBQUUsQ0FBQTtBQUUzRSxTQUFDLENBQUE7UUFFRCxJQUFJQSxnQkFBTyxDQUFDLFdBQVcsQ0FBQzthQUN0QixPQUFPLENBQUMsb0JBQW9CLENBQUM7YUFDN0IsT0FBTyxDQUFDLGlFQUFpRSxDQUFDO2FBQzFFLFNBQVMsQ0FBRSxNQUFNLElBQUc7WUFDcEIsTUFBTTtBQUNKLGlCQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO0FBQ3hDLGlCQUFBLFFBQVEsQ0FBRSxDQUFNLEtBQUssS0FBRyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDeEIsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7QUFDdkMsZ0JBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNqQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDO0FBQ25FLGdCQUFBLGdDQUFnQyxFQUFFLENBQUM7YUFDbkMsQ0FBQSxDQUFDLENBQUE7QUFDSixTQUFDLENBQUMsQ0FDRjtBQUVELFFBQUEsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJQSxnQkFBTyxDQUFDLFdBQVcsQ0FBQzthQUMvQyxPQUFPLENBQUMsOENBQThDLENBQUM7YUFDdkQsU0FBUyxDQUFFLE1BQU0sSUFBRztZQUNwQixNQUFNO0FBQ0osaUJBQUEsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLGlCQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDO0FBQy9DLGlCQUFBLFFBQVEsQ0FBRSxDQUFNLEtBQUssS0FBRyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDeEIsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUM7QUFDOUMsZ0JBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNqQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBRSxDQUFDO0FBQzlFLGdCQUFBLGdDQUFnQyxFQUFFLENBQUM7YUFDbkMsQ0FBQSxDQUFDLENBQ0Y7QUFFRixTQUFDLENBQUMsQ0FDRjtBQUVELFFBQUEsZ0NBQWdDLEVBQUUsQ0FBQzs7QUFHbkMsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUc7QUFDekIsWUFBQSxDQUFDLENBQUMsZUFBZSxDQUFFLFdBQVcsRUFBRSxNQUFZLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQSxFQUFBLE9BQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBLEVBQUEsQ0FBQSxDQUFFLENBQUM7QUFDaEYsU0FBQyxDQUFDLENBQUM7S0FFSDtBQUVEOztBQy9HRCxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztBQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0FBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztBQUN4QixNQUFNLElBQUksR0FBSyxXQUFXLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7TUFFekMsWUFBWSxDQUFBO0FBRVYsSUFBQSxTQUFTLENBQUMsUUFBZSxFQUFBOztZQUN0QyxNQUFNLE1BQU0sR0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sR0FBRyxHQUFVLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQ3hHLFlBQUEsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3pDO0FBQ0MsZ0JBQUEsSUFBSSxFQUFFLFFBQVE7QUFDZCxnQkFBQSxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFDO2dCQUN2QixVQUFVO2dCQUNWLElBQUk7QUFDSixhQUFBLEVBQ0QsR0FBRyxFQUNIO0FBQ0MsZ0JBQUEsSUFBSSxFQUFFLFNBQVM7QUFDZixnQkFBQSxNQUFNLEVBQUUsR0FBRzthQUNYLEVBQ0QsS0FBSyxFQUNMLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUN0QixDQUFDO0FBRUYsWUFBQSxPQUFPLFVBQVUsQ0FBQztTQUNsQixDQUFBLENBQUE7QUFBQSxLQUFBO0lBRVksY0FBYyxDQUFDLElBQVksRUFBRSxRQUFnQixFQUFBOztZQUV6RCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFM0MsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BELFlBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOztZQUdsRSxNQUFNLGNBQWMsR0FBRyxJQUFJLFVBQVUsQ0FDcEMsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDMUIsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUMsRUFDN0IsR0FBRyxFQUNILGtCQUFrQixDQUNsQixDQUNELENBQUM7QUFFRixZQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFFLE1BQU0sQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBRSxDQUFDO0FBQ25GLFlBQUEsVUFBVSxDQUFDLEdBQUcsQ0FBRSxNQUFNLEVBQUUsQ0FBQyxDQUFFLENBQUM7WUFDNUIsVUFBVSxDQUFDLEdBQUcsQ0FBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBRSxDQUFDO0FBRXBELFlBQUEsT0FBTyxVQUFVLENBQUM7U0FDbEIsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVPLElBQUEsZUFBZSxDQUFFLEtBQWtCLEVBQUE7UUFDMUMsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLFFBQUEsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUU7O1lBRTVDLE1BQU0sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzFDLFNBQUE7QUFDRCxRQUFBLE9BQU8sTUFBTSxDQUFDO0tBQ2Q7SUFFWSxlQUFlLENBQUMsSUFBWSxFQUFFLFFBQWdCLEVBQUE7O1lBRTFELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7O1lBRzdELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFFLENBQUM7QUFFNUQsWUFBQSxPQUFPLFVBQVUsQ0FBQztTQUNsQixDQUFBLENBQUE7QUFBQSxLQUFBO0FBRU8sSUFBQSxhQUFhLENBQUMsR0FBVyxFQUFBO1FBQ2hDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNoQixRQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLFNBQUE7QUFDRCxRQUFBLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDOUI7SUFFWSxnQkFBZ0IsQ0FBQyxjQUEwQixFQUFFLFFBQWdCLEVBQUE7O1lBQ3pFLElBQUk7O2dCQUdILE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFVBQVUsQ0FBQyxDQUFDOztnQkFHbEQsTUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUU1RCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7O2dCQUczQyxJQUFJLGNBQWMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUMvQyxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBQyxFQUM3QixHQUFHLEVBQ0gsa0JBQWtCLENBQ2xCLENBQUM7O2dCQUdGLElBQUksYUFBYSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdkQsZ0JBQUEsT0FBTyxhQUFhLENBQUM7QUFDckIsYUFBQTtBQUFDLFlBQUEsT0FBTyxDQUFDLEVBQUU7O0FBRVgsZ0JBQUEsT0FBTyxJQUFJLENBQUM7QUFDWixhQUFBO1NBQ0QsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVZLGlCQUFpQixDQUFDLGFBQXFCLEVBQUUsUUFBZ0IsRUFBQTs7WUFDckUsSUFBSTtnQkFFSCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUU1RCxPQUFPLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O0FBb0I1RCxhQUFBO0FBQUMsWUFBQSxPQUFPLENBQUMsRUFBRTs7QUFFWCxnQkFBQSxPQUFPLElBQUksQ0FBQztBQUNaLGFBQUE7U0FDRCxDQUFBLENBQUE7QUFBQSxLQUFBO0FBRUQ7O0FDMUlNLE1BQU0saUJBQWlCLEdBQUc7QUFDaEMsSUFBQSxJQUFJLEVBQUUsU0FBUztBQUNmLElBQUEsRUFBRSxFQUFFLElBQUksVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM1RSxJQUFBLFNBQVMsRUFBRSxHQUFHO0NBQ2QsQ0FBQTtNQUVZLG9CQUFvQixDQUFBO0FBRWxCLElBQUEsUUFBUSxDQUFDLFFBQWdCLEVBQUE7O0FBQ3RDLFlBQUEsSUFBSSxVQUFVLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNuQyxJQUFJLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWhELFlBQUEsSUFBSSxjQUFjLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUVwRixJQUFJLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUN0QyxLQUFLLEVBQ0wsY0FBYyxFQUNkLGlCQUFpQixFQUNqQixLQUFLLEVBQ0wsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQ3RCLENBQUM7QUFFRixZQUFBLE9BQU8sR0FBRyxDQUFDO1NBQ1gsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVEOztBQUVHO0lBQ1UsZUFBZSxDQUFDLElBQVksRUFBRSxRQUFnQixFQUFBOztZQUMxRCxJQUFJLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFeEMsWUFBQSxJQUFJLFVBQVUsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ25DLElBQUksY0FBYyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRzdDLFlBQUEsSUFBSSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDOUQsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FDdEMsQ0FBQyxDQUFDOztBQUdILFlBQUEsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRTlELFlBQUEsT0FBTyxVQUFVLENBQUM7U0FDbEIsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVPLElBQUEsYUFBYSxDQUFDLEdBQVcsRUFBQTtRQUNoQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDaEIsUUFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixTQUFBO0FBQ0QsUUFBQSxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzlCO0lBRVksaUJBQWlCLENBQUMsYUFBcUIsRUFBRSxRQUFnQixFQUFBOztZQUNyRSxJQUFJOztnQkFFSCxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUU3RCxJQUFJLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBR3hDLGdCQUFBLElBQUksY0FBYyxHQUFHLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDOztBQUd6RixnQkFBQSxJQUFJLFVBQVUsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RELGdCQUFBLE9BQU8sYUFBYSxDQUFDO0FBQ3JCLGFBQUE7QUFBQyxZQUFBLE9BQU8sQ0FBQyxFQUFFO0FBQ1gsZ0JBQUEsT0FBTyxJQUFJLENBQUM7QUFDWixhQUFBO1NBQ0QsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVEOztBQ3RFb0IsTUFBQSxZQUFhLFNBQVFDLGNBQUssQ0FBQTtBQUs5QyxJQUFBLFdBQUEsQ0FDQyxHQUFRLEVBQ1IsS0FBYSxFQUNiLElBQWUsR0FBQSxFQUFFLEVBQ2pCLGNBQXNCLEVBQUE7UUFFdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBVFosSUFBYyxDQUFBLGNBQUEsR0FBWSxLQUFLLENBQUM7QUFVL0IsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM1QixRQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLFFBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7S0FDckM7SUFFRCxNQUFNLEdBQUE7QUFDTCxRQUFBLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFFekIsUUFBQSxJQUFJLFNBQTZCLENBQUM7QUFDbEMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJRCxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNsQyxXQUFXLENBQUUsRUFBRSxJQUFFO1lBQ2pCLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDZixZQUFBLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLEVBQUUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2pDLFlBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFlBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7WUFDaEMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUNuQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO0FBQ3RDLFNBQUMsQ0FBQyxDQUNGO1FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUU3RCxRQUFBLE1BQU0sUUFBUSxHQUFHLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFeEMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFDO1lBRXZCLFFBQVE7aUJBQ04sU0FBUyxDQUFFLEVBQUUsSUFBRztnQkFDaEIsRUFBRTtxQkFDQSxhQUFhLENBQUMsTUFBTSxDQUFDO3FCQUNyQixPQUFPLENBQUUsR0FBRyxJQUFHO29CQUNmLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO0FBQ3RELG9CQUFBLElBQUlFLGVBQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2QixpQkFBQyxDQUFDLENBQ0Y7QUFDRCxnQkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUV4QjtBQUNGLGFBQUMsQ0FBQyxDQUNGO0FBQ0QsU0FBQTtRQUVELFFBQVE7YUFDTixTQUFTLENBQUUsRUFBRSxJQUFHO1lBQ2hCLEVBQUU7QUFDQSxpQkFBQSxVQUFVLEVBQUU7aUJBQ1osYUFBYSxDQUFDLGtCQUFrQixDQUFDO2lCQUNqQyxPQUFPLENBQUUsR0FBRyxJQUFHO0FBQ2YsZ0JBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNkLGFBQUMsQ0FBQyxDQUNGO0FBQ0YsU0FBQyxDQUFDLENBQ0Y7S0FFRDtBQUVEOztNQzVEWSxRQUFRLENBQUE7QUFFcEI7O0FBRUU7QUFDSyxJQUFBLE9BQU8sbUJBQW1CLEdBQUE7UUFDaEMsT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxLQUFLLElBQUksQ0FBQztLQUN4RDtJQUVNLE9BQU8sb0JBQW9CLENBQ2pDLEVBQ0MsU0FBUyxFQUNULElBQUksRUFDSixJQUFJLEdBQUcsRUFBRSxFQUNULFNBQVMsR0FBRyxLQUFLLEVBQ2pCLFdBQVcsR0FBRyxFQUFFLEVBQ2hCLFlBQVksR0FBRyxFQUFFLEVBQ2pCLGdCQUFnQixFQUNoQixlQUFlLEdBQ2MsRUFBQTtBQUU5QixRQUFBLE1BQU0sUUFBUSxHQUFHLElBQUlGLGdCQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUM7YUFDYixPQUFPLENBQUMsSUFBSSxDQUFDO2FBQ2IsU0FBUyxDQUFFLEVBQUUsSUFBRTtZQUNmLEVBQUU7aUJBQ0EsT0FBTyxDQUFFLGlCQUFpQixDQUFFO2lCQUM1QixPQUFPLENBQUUsR0FBRyxJQUFHOztnQkFFZixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFHLEVBQUUsWUFBWUcsc0JBQWEsQ0FBRSxDQUFDO2dCQUMxRixJQUFJLFNBQVMsWUFBWUEsc0JBQWEsRUFBQztvQkFDdEMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksVUFBVSxHQUFHLE1BQU0sR0FBRyxVQUFVLENBQUM7QUFDcEYsaUJBQUE7QUFDRixhQUFDLENBQUMsQ0FDRjtBQUNGLFNBQUMsQ0FBQzthQUNELE9BQU8sQ0FBRSxFQUFFLElBQUc7QUFDZCxZQUFBLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDL0IsWUFBQSxFQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFCLFlBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQzdCLElBQUksZ0JBQWdCLElBQUUsSUFBSSxFQUFDO0FBQzFCLGdCQUFBLEVBQUUsQ0FBQyxRQUFRLENBQUUsZ0JBQWdCLENBQUUsQ0FBQztBQUNoQyxhQUFBO1lBQ0QsSUFBSSxlQUFlLElBQUUsSUFBSSxFQUFDO2dCQUN6QixFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsS0FBRztBQUM1QixvQkFBQSxJQUFLLEVBQUUsQ0FBQyxHQUFHLEtBQUssT0FBTyxFQUFHO3dCQUN6QixFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDcEIsd0JBQUEsZUFBZSxDQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO0FBQ2pDLHFCQUFBO0FBQ0YsaUJBQUMsQ0FBQTtBQUNELGFBQUE7QUFDRCxZQUFBLElBQUksU0FBUyxFQUFDO0FBQ2IsZ0JBQUEsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN4QyxhQUFBO0FBQ0YsU0FBQyxDQUFFLENBQ0g7QUFFRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0tBQ2hCO0FBR0Q7O0FDdEVvQixNQUFBLGFBQWMsU0FBUUYsY0FBSyxDQUFBO0lBYS9DLFdBQ0MsQ0FBQSxHQUFRLEVBQ1IsWUFBb0IsRUFDcEIsZUFBd0IsRUFDeEIsZUFBMEIsR0FBQSxJQUFJLEVBQzlCLElBQUEsR0FBYyxJQUFJLEVBQUE7UUFFbEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztRQWpCSixJQUFlLENBQUEsZUFBQSxHQUFZLElBQUksQ0FBQztRQUNoQyxJQUFXLENBQUEsV0FBQSxHQUFZLElBQUksQ0FBQzs7UUFLN0IsSUFBZSxDQUFBLGVBQUEsR0FBWSxLQUFLLENBQUM7UUFDakMsSUFBYyxDQUFBLGNBQUEsR0FBWSxJQUFJLENBQUM7UUFDL0IsSUFBVSxDQUFBLFVBQUEsR0FBWSxJQUFJLENBQUM7QUFVakMsUUFBQSxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztBQUN2QyxRQUFBLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0FBQ3ZDLFFBQUEsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7QUFDakMsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztLQUN4QjtJQUVELE1BQU0sR0FBQTs7QUFDTCxRQUFBLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFekIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDOztRQUdsQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFbEIsSUFBSSxRQUFRLEdBQUcsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLGVBQWUsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBSSxFQUFFLENBQUM7UUFDMUMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksSUFBSSxHQUFHLENBQUEsRUFBQSxHQUFBLElBQUksQ0FBQyxXQUFXLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUksRUFBRSxDQUFDO1FBRWxDLElBQUlELGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUMxQyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksR0FBRyxZQUFZLENBQy9DLENBQUM7O0FBSUYsUUFBa0IsUUFBUSxDQUFDLG9CQUFvQixDQUFDO0FBQy9DLFlBQUEsU0FBUyxFQUFFLFNBQVM7QUFDcEIsWUFBQSxJQUFJLEVBQUUsV0FBVztBQUNqQixZQUFBLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsR0FBRyxDQUFBLE1BQUEsRUFBUyxJQUFJLENBQUMsV0FBVyxDQUFFLENBQUE7QUFDakUsWUFBQSxZQUFZLEVBQUUsUUFBUTtBQUN0QixZQUFBLFNBQVMsRUFBRSxJQUFJO0FBQ2YsWUFBQSxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssS0FBSTtnQkFDM0IsUUFBUSxHQUFHLEtBQUssQ0FBQztnQkFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2FBQ2xCO0FBQ0QsWUFBQSxlQUFlLEVBQUUsQ0FBQyxLQUFLLEtBQUk7Z0JBQzFCLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUVsQixnQkFBQSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQ3ZCLG9CQUFBLElBQUksZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFDOztBQUV4Qyx3QkFBQSxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWUcsc0JBQWEsQ0FBRSxDQUFDO3dCQUN0RixJQUFLLEtBQUssWUFBWUEsc0JBQWEsRUFBRTtBQUNwQyw0QkFBQSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCLHlCQUFBO0FBRUQscUJBQUE7QUFBSyx5QkFBQSxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUM7O0FBRW5DLHdCQUFBLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWUEsc0JBQWEsQ0FBRSxDQUFDO3dCQUMzRSxJQUFLLEtBQUssWUFBWUEsc0JBQWEsRUFBRTtBQUNwQyw0QkFBQSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCLHlCQUFBO0FBQ0QscUJBQUE7eUJBQUssSUFBSSxRQUFRLEVBQUUsRUFBRTt3QkFDckIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2IscUJBQUE7QUFDRCxpQkFBQTthQUNEO0FBQ0QsU0FBQSxFQUFFOzs7QUFLSCxRQUFBLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixDQUFDO0FBQ3RELFlBQUEsU0FBUyxFQUFHLFNBQVM7QUFDckIsWUFBQSxJQUFJLEVBQUUsbUJBQW1CO0FBQ3pCLFlBQUEsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLEtBQUk7Z0JBQzNCLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUNsQjtBQUNELFlBQUEsZUFBZSxFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMxQixXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDbEIsZ0JBQUEsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztvQkFDMUIsSUFBSyxRQUFRLEVBQUUsRUFBRTtBQUNoQix3QkFBQSxJQUFLLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUU7O0FBRS9CLDRCQUFBLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWUEsc0JBQWEsQ0FBRSxDQUFDOzRCQUMzRSxJQUFLLEtBQUssWUFBWUEsc0JBQWEsRUFBRTtBQUNwQyxnQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCLDZCQUFBO0FBQ0QseUJBQUE7QUFDRCxxQkFBQTtBQUNELGlCQUFBO2FBQ0Q7QUFDRCxTQUFBLENBQUMsQ0FBQztBQUVILFFBQUEsSUFBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDM0IsWUFBQSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbEMsU0FBQTs7O0FBS0QsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJSCxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNsQyxPQUFPLENBQUMsd0JBQXdCLENBQUM7YUFDakMsT0FBTyxDQUFFLEVBQUUsSUFBRTs7QUFFYixZQUFBLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztBQUN6QyxZQUFBLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsRUFBRSxDQUFDLFFBQVEsQ0FBRSxDQUFDLElBQUcsSUFBSSxHQUFHLENBQUMsQ0FBRSxDQUFDO0FBQzVCLFlBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLEtBQUk7QUFDN0MsZ0JBQUEsSUFDQyxFQUFFLENBQUMsR0FBRyxJQUFJLE9BQU87QUFDZCx1QkFBQSxNQUFNLFlBQVksZ0JBQWdCO0FBQ2xDLHVCQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDekI7b0JBQ0QsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNwQixJQUFLLFFBQVEsRUFBRSxFQUFFO3dCQUNoQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDYixxQkFBQTtBQUNELGlCQUFBO0FBQ0YsYUFBQyxDQUFDLENBQUM7QUFDSixTQUFDLENBQUMsQ0FDRjtBQUNELFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUM7QUFDdEIsWUFBQSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3ZCLFNBQUE7O1FBSUQsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUUsRUFBRSxJQUFFO1lBQ3JDLEVBQUU7aUJBQ0EsYUFBYSxDQUFDLFNBQVMsQ0FBQztpQkFDeEIsT0FBTyxDQUFFLEdBQUcsSUFBRztnQkFDZixJQUFJLFFBQVEsRUFBRSxFQUFDO29CQUNkLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLGlCQUFBO0FBQ0YsYUFBQyxDQUFDLENBQ0Y7QUFDRixTQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQWU7WUFDL0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBRWxCLFlBQUEsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRTdCLElBQUssSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDMUIsSUFBSSxRQUFRLElBQUksV0FBVyxFQUFDOztBQUUzQixvQkFBQSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUNuRCxvQkFBQSxPQUFPLEtBQUssQ0FBQztBQUNiLGlCQUFBO0FBQ0QsYUFBQTtBQUVELFlBQUEsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFDNUIsWUFBQSxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztBQUMvQixZQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBRXZCLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDYixTQUFDLENBQUE7S0FFRDtJQUVPLFVBQVUsR0FBQTtBQUNqQixRQUFBLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQzdCLFFBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDM0IsUUFBQSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztLQUN2QjtBQUVEOztBQzNLRCxNQUFNLE9BQU8sR0FBVyxNQUFNLENBQUM7QUFDL0IsTUFBTSxnQkFBZ0IsR0FBVyxPQUFPLEdBQUcsR0FBRyxDQUFDO0FBQy9DLE1BQU0sU0FBUyxHQUFXLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDekMsTUFBTSxPQUFPLEdBQVcsT0FBTyxDQUFDO0FBRWhDLE1BQU0sS0FBSyxHQUFXLElBQUksQ0FBQztBQUViLE1BQU8scUJBQXFCLENBQUE7SUFLbkMsTUFBTSxDQUFDLE1BQWtCLEVBQUUsUUFBbUMsRUFBQTs7QUFDbkUsWUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixZQUFBLElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDO0FBQy9CLFlBQUEsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMscUJBQXFCLENBQUM7WUFFdEQsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUNqQixnQkFBQSxFQUFFLEVBQUUsY0FBYztBQUNsQixnQkFBQSxJQUFJLEVBQUUsaUJBQWlCO0FBQ3ZCLGdCQUFBLElBQUksRUFBRSxNQUFNO2dCQUNaLG1CQUFtQixFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEtBQUssSUFBSSxDQUFDLDRCQUE0QixDQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBRTtBQUNuSCxhQUFBLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDakIsZ0JBQUEsRUFBRSxFQUFFLHVCQUF1QjtBQUMzQixnQkFBQSxJQUFJLEVBQUUsMEJBQTBCO0FBQ2hDLGdCQUFBLElBQUksRUFBRSxNQUFNO2dCQUNaLG1CQUFtQixFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEtBQUssSUFBSSxDQUFDLDRCQUE0QixDQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBRTtBQUNsSCxhQUFBLENBQUMsQ0FBQztTQUVILENBQUEsQ0FBQTtBQUFBLEtBQUE7SUFFRCxRQUFRLEdBQUE7S0FFUDtJQUVNLGVBQWUsQ0FDckIsV0FBd0IsRUFDeEIsbUJBQXlDLEVBQUE7UUFFekMsSUFBSUEsZ0JBQU8sQ0FBQyxXQUFXLENBQUM7QUFDdEIsYUFBQSxVQUFVLEVBQUU7YUFDWixPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FDeEM7O1FBR0QsSUFBSUEsZ0JBQU8sQ0FBQyxXQUFXLENBQUM7YUFDdEIsT0FBTyxDQUFDLGlDQUFpQyxDQUFDO2FBQzFDLE9BQU8sQ0FBQyx5REFBeUQsQ0FBQzthQUNsRSxTQUFTLENBQUUsTUFBTSxJQUFHO1lBQ3BCLE1BQU07QUFDSixpQkFBQSxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQztBQUNqRCxpQkFBQSxRQUFRLENBQUUsQ0FBTSxLQUFLLEtBQUcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ3hCLGdCQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO2dCQUNoRCxNQUFNLG1CQUFtQixFQUFFLENBQUM7YUFDNUIsQ0FBQSxDQUFDLENBQUE7QUFDSixTQUFDLENBQUMsQ0FDRjtRQUVELElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxjQUFjLENBQUM7YUFDdkIsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO2FBQ2hELFNBQVMsQ0FBRSxNQUFNLElBQUc7WUFDcEIsTUFBTTtBQUNKLGlCQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQztBQUM3QyxpQkFBQSxRQUFRLENBQUUsQ0FBTSxLQUFLLEtBQUcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ3hCLGdCQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDNUMsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO2FBQzVCLENBQUEsQ0FBQyxDQUFBO0FBQ0osU0FBQyxDQUFDLENBQ0Y7S0FFRDtBQUlPLElBQUEsNEJBQTRCLENBQ25DLFFBQWlCLEVBQ2pCLE1BQWMsRUFDZCxJQUFrQixFQUNsQixjQUF1QixFQUFBO0FBRXZCLFFBQUEsSUFBSyxRQUFRLElBQUksUUFBUSxDQUFDLG1CQUFtQixFQUFFLEVBQUU7OztBQUdoRCxZQUFBLE9BQU8sSUFBSSxDQUFDO0FBQ1osU0FBQTtRQUVELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEMsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVwQyxRQUFBLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBQztBQUMzQyxZQUFBLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDaEMsWUFBQSxRQUFRLEdBQUcsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUV0QyxZQUFBLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDNUIsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxZQUFBLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNuRCxTQUFBO0FBQUksYUFBQTtBQUNKLFlBQUEsSUFBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFOztnQkFFakMsUUFBUSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBRSxDQUFDO2dCQUN4RSxNQUFNLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFFLENBQUM7QUFDcEUsYUFBQTtBQUNELFNBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUV4RCxRQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUMzQixRQUFRLEVBQ1IsTUFBTSxFQUNOLGFBQWEsRUFDYixRQUFRLEVBQ1IsTUFBTSxFQUNOLGNBQWMsQ0FDZCxDQUFDO0tBQ0Y7QUFFTyxJQUFBLDJCQUEyQixDQUFDLE1BQWMsRUFBRSxJQUFZLEVBQUUsWUFBMkIsRUFBQTtBQUM1RixRQUFBLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBRSxDQUFDO1FBRWxFLEtBQUssSUFBSSxNQUFNLEdBQUcsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDcEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QyxZQUFBLE1BQU0sYUFBYSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzNDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFdkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBRSxTQUFTLEVBQUUsWUFBWSxDQUFFLENBQUM7WUFDNUQsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFDO0FBQ3BCLGdCQUFBLE9BQU8sU0FBUyxDQUFDO0FBQ2pCLGFBQUE7QUFDRCxTQUFBO0FBRUQsUUFBQSxPQUFPLFlBQVksQ0FBQztLQUNwQjtBQUVPLElBQUEsMkJBQTJCLENBQUMsTUFBYyxFQUFFLElBQVksRUFBRSxZQUEyQixFQUFBO0FBQzVGLFFBQUEsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBRSxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFFLENBQUM7QUFDbEUsUUFBQSxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFdEMsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBRSxFQUFDLElBQUksRUFBQyxXQUFXLEVBQUUsRUFBRSxFQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUUsQ0FBQztBQUVoRyxRQUFBLEtBQUssSUFBSSxNQUFNLEdBQUcsVUFBVSxFQUFFLE1BQU0sSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdDLFlBQUEsTUFBTSxhQUFhLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDM0MsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUV2RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFFLFNBQVMsRUFBRSxZQUFZLENBQUUsQ0FBQztZQUU1RCxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUM7QUFDcEIsZ0JBQUEsT0FBTyxZQUFZLENBQUM7QUFDcEIsYUFBQTtBQUNELFNBQUE7QUFFRCxRQUFBLE9BQU8sWUFBWSxDQUFDO0tBQ3BCO0FBRU8sSUFBQSxnQkFBZ0IsQ0FBRSxhQUFxQixFQUFBO0FBRTlDLFFBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7UUFFNUMsTUFBTSxDQUFDLDBCQUEwQixHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMvRSxRQUFBLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsMEJBQTBCLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVyRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUxRCxRQUFBLE1BQU0sQ0FBQyx3QkFBd0I7QUFDOUIsWUFBQSxhQUFhLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO0FBQ3JDLG1CQUFBLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO0FBQ2pDLG1CQUFBLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQ2xDO1FBRUQsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsa0JBQWtCLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDO0FBQ3pFLFFBQUEsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQztRQUVuRixJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUM7WUFDckIsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDakUsWUFBQSxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFDO0FBQzlCLGdCQUFBLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBQzFCLGFBQUE7QUFDRCxTQUFBO0FBRUQsUUFBQSxPQUFPLE1BQU0sQ0FBQztLQUNkO0FBRU8sSUFBQSxnQkFBZ0IsQ0FDdkIsUUFBaUIsRUFDakIsTUFBYyxFQUNkLGFBQXFCLEVBQ3JCLG1CQUF3QyxFQUN4QyxpQkFBc0MsRUFDdEMsY0FBdUIsRUFDdkIsa0JBQTBCLElBQUksRUFBQTs7UUFHOUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFL0QsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFFBQVEsRUFBQztBQUNiLGdCQUFBLElBQUlFLGVBQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xDLGFBQUE7QUFDRCxZQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2IsU0FBQTtRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUU7WUFDbkUsSUFBSSxDQUFDLFFBQVEsRUFBQztBQUNiLGdCQUFBLElBQUlBLGVBQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0FBQ2pELGFBQUE7QUFDRCxZQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2IsU0FBQTtBQUVELFFBQUEsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLElBQUksQ0FBQyxlQUFlLEVBQUM7QUFDcEQsWUFBQSxPQUFPLEtBQUssQ0FBQztBQUNiLFNBQUE7QUFFRCxRQUFBLElBQUksUUFBUSxFQUFFO0FBQ2IsWUFBQSxPQUFPLElBQUksQ0FBQztBQUNaLFNBQUE7QUFFRCxRQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7O1FBSzdELElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztRQUN6QixJQUFJLFdBQVcsR0FBWSxDQUFBLEVBQUEsR0FBQSxpQkFBaUIsQ0FBQyxXQUFXLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUUsSUFBSSxDQUFDO0FBQy9ELFFBQUEsSUFBSyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFO1lBQzFDLE1BQU0sd0JBQXdCLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxDQUFFLFVBQVUsQ0FBRSxDQUFDO0FBQ25GLFlBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFDLHdCQUF3QixFQUFDLENBQUMsQ0FBQztBQUUxQyxZQUFBLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUM7WUFDcEQsV0FBVyxHQUFHLFdBQVcsS0FBQSxJQUFBLElBQVgsV0FBVyxLQUFBLEtBQUEsQ0FBQSxHQUFYLFdBQVcsR0FBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUM7QUFDM0QsU0FBQTtRQUVELE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUU1RixNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQWEsQ0FDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQ2YsaUJBQWlCLENBQUMsVUFBVSxFQUM1QixlQUFlLEVBQ2YsZUFBZSxFQUNmLFdBQVcsQ0FDWCxDQUFDO0FBRUYsUUFBQSxPQUFPLENBQUMsT0FBTyxHQUFHLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBOztBQUM1QixZQUFBLElBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFO2dCQUM5QixPQUFPO0FBQ1AsYUFBQTtZQUNELE1BQU0sRUFBRSxHQUFHLENBQUEsRUFBQSxHQUFBLE9BQU8sQ0FBQyxjQUFjLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUksRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sSUFBSSxHQUFHLENBQUEsRUFBQSxHQUFBLE9BQU8sQ0FBQyxVQUFVLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUksRUFBRSxDQUFDO1lBRXRDLElBQUksaUJBQWlCLENBQUMsVUFBVSxFQUFFO0FBQ2pDLGdCQUFBLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFDdEMsZ0JBQUEsV0FBVyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7QUFDakMsZ0JBQUEsV0FBVyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFFeEIsZ0JBQUEsSUFBSSxDQUFDLGdCQUFnQixDQUNwQixNQUFNLEVBQ04sV0FBVyxFQUNYLEVBQUUsRUFDRixtQkFBbUIsRUFDbkIsaUJBQWlCLENBQ2pCLENBQUM7O0FBR0YsZ0JBQUEsc0JBQXNCLENBQUMsR0FBRyxDQUFFLEVBQUUsUUFBUSxFQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFFLENBQUM7QUFFdEUsYUFBQTtBQUFNLGlCQUFBO0FBRU4sZ0JBQUEsSUFBSSxjQUF3QixDQUFDO0FBQzdCLGdCQUFBLElBQUksaUJBQWlCLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUM7b0JBQzlDLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FDN0MsTUFBTSxFQUNOLGlCQUFpQixDQUFDLFdBQVcsRUFDN0IsRUFBRSxFQUNGLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsY0FBYyxDQUNkLENBQUM7QUFDRixpQkFBQTtBQUFJLHFCQUFBO29CQUNKLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FDbkQsTUFBTSxFQUNOLGlCQUFpQixDQUFDLFdBQVcsRUFDN0IsRUFBRSxFQUNGLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsY0FBYyxDQUNkLENBQUM7QUFDRixpQkFBQTs7QUFHRCxnQkFBQSxJQUFLLGNBQWMsRUFBRztBQUNyQixvQkFBQSxzQkFBc0IsQ0FBQyxHQUFHLENBQUUsRUFBRSxRQUFRLEVBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLENBQUUsQ0FBQztBQUN0RSxpQkFBQTtBQUVELGFBQUE7QUFDRixTQUFDLENBQUEsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVmLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDWjtJQUVhLGdCQUFnQixDQUM3QixNQUFjLEVBQ2QsV0FBd0IsRUFDeEIsUUFBZ0IsRUFDaEIsbUJBQXdDLEVBQ3hDLGlCQUFzQyxFQUFBOzs7QUFHdEMsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FDeEMsTUFBTSxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQ3hELFdBQVcsQ0FBQyxJQUFJLENBQ2hCLENBQUM7QUFDRixZQUFBLE1BQU0sQ0FBQyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUM1RCxZQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNyQyxDQUFBLENBQUE7QUFBQSxLQUFBO0lBRWEsa0JBQWtCLENBQy9CLE1BQWMsRUFDZCxXQUF3QixFQUN4QixRQUFnQixFQUNoQixjQUFtQyxFQUNuQyxZQUFpQyxFQUNqQyxjQUF1QixFQUFBOzs7QUFJdkIsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO0FBQ2xDLFlBQUEsTUFBTSxhQUFhLEdBQUcsTUFBTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdGLElBQUksYUFBYSxLQUFLLElBQUksRUFBRTtBQUMzQixnQkFBQSxJQUFJQSxlQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNuQyxnQkFBQSxPQUFPLEtBQUssQ0FBQztBQUNiLGFBQUE7QUFBTSxpQkFBQTtBQUVOLGdCQUFBLElBQUksY0FBYyxFQUFFO0FBQ25CLG9CQUFBLE1BQU0sQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2xELG9CQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN2QyxpQkFBQTtBQUFNLHFCQUFBO29CQUNOLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqSCxvQkFBQSxZQUFZLENBQUMsT0FBTyxHQUFHLE1BQUs7d0JBQzNCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDZixJQUFJLFlBQVksQ0FBQyxjQUFjLEVBQUU7QUFDaEMsNEJBQUEsTUFBTSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbEQsNEJBQUEsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLHlCQUFBO0FBQ0YscUJBQUMsQ0FBQTtvQkFDRCxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDcEIsaUJBQUE7QUFDRCxhQUFBO0FBQ0QsWUFBQSxPQUFPLElBQUksQ0FBQztTQUNaLENBQUEsQ0FBQTtBQUFBLEtBQUE7SUFFYSx3QkFBd0IsQ0FDckMsTUFBYyxFQUNkLFdBQXdCLEVBQ3hCLFFBQWdCLEVBQ2hCLGNBQW1DLEVBQ25DLFlBQWlDLEVBQ2pDLGNBQXVCLEVBQUE7OztZQUd2QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUUsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakYsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFO0FBQzNCLGdCQUFBLElBQUlBLGVBQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ25DLGdCQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2IsYUFBQTtBQUFNLGlCQUFBO0FBRU4sZ0JBQUEsSUFBSSxjQUFjLEVBQUU7QUFDbkIsb0JBQUEsTUFBTSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbEQsb0JBQUEsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLGlCQUFBO0FBQU0scUJBQUE7b0JBQ04sTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2pILG9CQUFBLFlBQVksQ0FBQyxPQUFPLEdBQUcsTUFBSzt3QkFDM0IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNmLElBQUksWUFBWSxDQUFDLGNBQWMsRUFBRTtBQUNoQyw0QkFBQSxNQUFNLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNsRCw0QkFBQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDdkMseUJBQUE7QUFDRixxQkFBQyxDQUFBO29CQUNELFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQixpQkFBQTtBQUNELGFBQUE7QUFDRCxZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ1osQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVPLElBQUEsdUJBQXVCLENBQUMsSUFBWSxFQUFBO0FBQzNDLFFBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUVqQyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDbkIsUUFBQSxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUMvRCxZQUFBLE1BQU0sQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDO0FBQ2pCLFlBQUEsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDOUQsU0FBQTtBQUFLLGFBQUEsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUM1RSxZQUFBLE1BQU0sQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDO0FBQ2pCLFlBQUEsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNyRSxTQUFBO0FBQUssYUFBQTtZQUNMLE9BQU8sSUFBSSxDQUFDO0FBQ1osU0FBQTs7QUFHRCxRQUFBLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBQztBQUM5QyxZQUFBLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxJQUFJLGFBQWEsR0FBQyxDQUFDLEVBQUM7Z0JBQ25CLE9BQU8sSUFBSSxDQUFDO0FBQ1osYUFBQTtBQUNELFlBQUEsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsYUFBYSxDQUFDLENBQUE7QUFDM0QsWUFBQSxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3hFLFNBQUE7QUFBSSxhQUFBO0FBQ0osWUFBQSxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0FBQ2xDLFNBQUE7QUFFRCxRQUFBLE9BQU8sTUFBTSxDQUFDO0tBRWQ7QUFFTyxJQUFBLGFBQWEsQ0FBQyxJQUFZLEVBQUE7QUFDakMsUUFBQSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUN6RCxZQUFBLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN4RCxTQUFBO0FBQ0QsUUFBQSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ2hFLFlBQUEsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDL0QsU0FBQTtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDWjtJQUVPLGdCQUFnQixDQUFFLGFBQXFCLEVBQUUsSUFBWSxFQUFBO1FBQzVELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUN4SCxZQUFBLElBQUksSUFBSSxFQUFDO0FBQ1IsZ0JBQUEsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNwRSxhQUFBO1lBQ0QsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNoRCxTQUFBO0FBQ0QsUUFBQSxPQUFPLGFBQWEsQ0FBQztLQUNyQjtBQUNELENBQUE7QUFFRCxNQUFNLGlCQUFpQixDQUFBO0FBU3RCLENBQUE7QUFFRCxNQUFNLFdBQVcsQ0FBQTtBQUdoQixDQUFBO0FBRUQsTUFBTSxXQUFXLENBQUE7QUFJaEI7O0FDcGRELElBQUssaUNBTUosQ0FBQTtBQU5ELENBQUEsVUFBSyxpQ0FBaUMsRUFBQTtBQUNyQyxJQUFBLGlDQUFBLENBQUEsaUNBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxNQUFJLENBQUE7QUFDSixJQUFBLGlDQUFBLENBQUEsaUNBQUEsQ0FBQSxhQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxhQUFXLENBQUE7QUFDWCxJQUFBLGlDQUFBLENBQUEsaUNBQUEsQ0FBQSxVQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxVQUFRLENBQUE7QUFDUixJQUFBLGlDQUFBLENBQUEsaUNBQUEsQ0FBQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsZ0JBQWMsQ0FBQTtBQUNkLElBQUEsaUNBQUEsQ0FBQSxpQ0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQU8sQ0FBQTtBQUNSLENBQUMsRUFOSSxpQ0FBaUMsS0FBakMsaUNBQWlDLEdBTXJDLEVBQUEsQ0FBQSxDQUFBLENBQUE7QUFFTSxNQUFNLGdDQUFnQyxHQUFHLGtDQUFrQyxDQUFDO0FBQzdFLE1BQU8sd0JBQXlCLFNBQVFFLHFCQUFZLENBQUE7QUFZekQsSUFBQSxXQUFBLENBQVksSUFBbUIsRUFBQTtRQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBVmIsUUFBQSxJQUFBLENBQUEsV0FBVyxHQUF1QyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUM7UUFDekYsSUFBa0IsQ0FBQSxrQkFBQSxHQUFVLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUEsSUFBQSxHQUFVLEVBQUUsQ0FBQztRQUNqQixJQUFpQixDQUFBLGlCQUFBLEdBQVUsRUFBRSxDQUFDOztBQVc3QixRQUFBLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUUsQ0FBQztBQUUxRixRQUFBLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFFLENBQUM7UUFFNUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDO1FBQzlDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7S0FFM0M7SUFFTyxjQUFjLEdBQUE7QUFDckIsUUFBQSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0FBQzdCLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNoRTtJQUVPLG9CQUFvQixHQUFBO0FBQzNCLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztLQUNuRTtJQUVRLFVBQVUsQ0FBQyxJQUFVLEVBQUUsTUFBYyxFQUFBOztRQUU3QyxJQUFLLE1BQU0sSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxpQ0FBaUMsQ0FBQyxRQUFRLEVBQUU7QUFDOUYsWUFBQSxJQUFJLENBQUMsT0FBTyxDQUFFLENBQUMsSUFBRztnQkFDakIsQ0FBQztxQkFDQyxVQUFVLENBQUMsUUFBUSxDQUFDO3FCQUNwQixPQUFPLENBQUMsTUFBTSxDQUFDO3FCQUNmLFFBQVEsQ0FBQyxNQUFNLENBQUM7cUJBQ2hCLE9BQU8sQ0FBRSxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBRSxDQUN2QztBQUNGLGFBQUMsQ0FBQyxDQUFDO0FBQ0gsWUFBQSxJQUFJLENBQUMsT0FBTyxDQUFFLENBQUMsSUFBRztnQkFDakIsQ0FBQztxQkFDQyxVQUFVLENBQUMsUUFBUSxDQUFDO3FCQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDO3FCQUNkLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQztxQkFDM0IsT0FBTyxDQUFFLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUUsQ0FDN0M7QUFDRixhQUFDLENBQUMsQ0FBQztBQUNILFNBQUE7QUFDRCxRQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzlCO0FBRU8sSUFBQSxXQUFXLENBQUUsS0FBWSxFQUFBO0FBQ2hDLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUMvQixJQUFJLEVBQUcsQ0FBTSxHQUFBLEVBQUEsS0FBSyxDQUFLLEdBQUEsQ0FBQTtBQUN2QixZQUFBLElBQUksRUFBRztBQUNMLGdCQUFBLEtBQUssRUFBRSxvQkFBb0I7QUFDNUIsYUFBQTtBQUNELFNBQUEsQ0FBQyxDQUFDO0tBQ0g7QUFFTyxJQUFBLGdCQUFnQixDQUFHLEVBQVUsRUFBQTtBQUNwQyxRQUFBLElBQUksRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUM7QUFDbEIsWUFBQSxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLFNBQUE7QUFDRCxRQUFBLE9BQU8sRUFBRSxDQUFDO0tBQ1Y7SUFFTyxlQUFlLENBQUcsRUFBVSxFQUFFLEdBQVcsRUFBQTtBQUNoRCxRQUFBLE1BQU0sYUFBYSxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUM7UUFDakMsT0FBTyxhQUFhLEdBQUcsRUFBRSxHQUFFLHlCQUF5QixDQUFDO0tBQ3JEO0lBRU8saUJBQWlCLEdBQUE7O0FBRXhCLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFOUMsSUFBSUosZ0JBQU8sQ0FBQyxTQUFTLENBQUM7YUFDcEIsT0FBTyxDQUFDLGdFQUFnRSxDQUFDLENBQzFFO1FBRUQsTUFBTSxNQUFNLEdBQUcsQ0FBTyxRQUFnQixFQUFFLE9BQWUsRUFBRSxJQUFXLEtBQUksU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO1lBQ3ZFLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2RCxZQUFBLFNBQVMsQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7QUFDN0IsWUFBQSxRQUFRLENBQUMsT0FBTyxDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBRTdCLElBQUssT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7O0FBR25ELGdCQUFBLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUM7QUFDbkMsZ0JBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUU1QyxnQkFBQSxNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUUzQixnQkFBQSxzQkFBc0IsQ0FBQyxHQUFHLENBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUM7QUFFNUUsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUU3RCxhQUFBO0FBQ0YsU0FBQyxDQUFBLENBQUE7UUFFRCxNQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUM7QUFDOUUsUUFBQSxJQUFJLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7UUFDN0MsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2pCLFFBQUEsSUFBSSxJQUFJLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDO0FBRXJDLFFBQUEsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixDQUFDO1lBQy9DLFNBQVM7QUFDVCxZQUFBLElBQUksRUFBQyxXQUFXO0FBQ2hCLFlBQUEsU0FBUyxFQUFHLElBQUk7QUFDaEIsWUFBQSxZQUFZLEVBQUUsUUFBUTtBQUN0QixZQUFBLGdCQUFnQixFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMzQixRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUNqQixTQUFTLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBRSxDQUFDO0FBQ3JELGdCQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUUsQ0FBQzthQUM1RDtBQUNELFlBQUEsZUFBZSxFQUFFLENBQUMsS0FBSyxLQUFHO2dCQUN6QixRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGdCQUFBLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7b0JBQ3ZCLFFBQVEsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2xELGlCQUFBO2FBQ0Q7QUFDRCxTQUFBLENBQUMsQ0FBQztBQUVILFFBQUEsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixDQUFDO1lBQzlDLFNBQVM7QUFDVCxZQUFBLElBQUksRUFBQyxVQUFVO0FBQ2YsWUFBQSxTQUFTLEVBQUcsS0FBSztBQUNqQixZQUFBLGdCQUFnQixFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMzQixPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNoQixTQUFTLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBRSxDQUFDO0FBQ3JELGdCQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUUsQ0FBQzthQUM1RDtBQUNELFlBQUEsZUFBZSxFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMxQixPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ2hCLGdCQUFBLE1BQU0sYUFBYSxHQUFHLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFDM0MsZ0JBQUEsSUFBSSxhQUFhLEVBQUM7b0JBQ2pCLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQy9DLGlCQUFBO2FBQ0Q7QUFDRCxTQUFBLENBQUMsQ0FBQztBQUVILFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7YUFDbEMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUNoQixhQUFBLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSTtBQUNmLFlBQUEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQixZQUFBLEVBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQyxJQUFHO2dCQUNoQixJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBQ1YsYUFBQyxDQUFDLENBQUM7QUFDSixTQUFDLENBQUMsQ0FDRjtBQUNELFFBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSTtBQUN6QyxZQUFBLElBQUssRUFBRSxDQUFDLEdBQUcsS0FBSyxPQUFPLEVBQUc7Z0JBQ3pCLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNwQixnQkFBQSxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNoQyxhQUFBO0FBQ0YsU0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQixTQUFTLENBQUUsRUFBRSxJQUFHO1lBQ2hCLEVBQUU7QUFDQSxpQkFBQSxNQUFNLEVBQUU7aUJBQ1IsT0FBTyxDQUFDLFlBQVksQ0FBQztpQkFDckIsVUFBVSxDQUFDLE1BQU0sQ0FBQztBQUNsQixpQkFBQSxPQUFPLENBQUUsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUUsQ0FDbkQ7QUFDRixTQUFDLENBQUMsQ0FDRjtBQUVELFFBQUEsT0FBTyxTQUFTLENBQUM7S0FDakI7SUFHTyxxQkFBcUIsR0FBQTtBQUM1QixRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTlDLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BCLE9BQU8sQ0FBQyxnREFBZ0QsQ0FBQyxDQUMxRDtRQUVELE1BQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxDQUFFLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQztBQUM5RSxRQUFBLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7UUFFeEQsUUFBUSxDQUFDLG9CQUFvQixDQUFDO1lBQzdCLFNBQVM7QUFDVCxZQUFBLElBQUksRUFBQyxXQUFXO1lBQ2hCLFlBQVksRUFBRSxJQUFJLENBQUMsa0JBQWtCO0FBQ3JDLFlBQUEsU0FBUyxFQUFHLElBQUk7WUFDaEIsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN2QyxZQUFBLGdCQUFnQixFQUFFLENBQUMsS0FBSyxLQUFJO0FBQzNCLGdCQUFBLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7YUFDaEM7WUFDRCxlQUFlLEVBQUUsTUFBWSxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUEsRUFBQSxPQUFBLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUEsRUFBQSxDQUFBO0FBQ2xFLFNBQUEsQ0FBQyxDQUFDO1FBRUgsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7YUFDcEIsU0FBUyxDQUFFLEVBQUUsSUFBRztZQUNoQixFQUFFO0FBQ0EsaUJBQUEsTUFBTSxFQUFFO2lCQUNSLE9BQU8sQ0FBQyxXQUFXLENBQUM7aUJBQ3BCLFVBQVUsQ0FBQyxlQUFlLENBQUM7aUJBQzNCLE9BQU8sQ0FBRSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBRSxDQUNwRDtBQUNGLFNBQUMsQ0FBQyxDQUNGO0FBRUQsUUFBQSxPQUFPLFNBQVMsQ0FBQztLQUNqQjtJQUVhLGFBQWEsR0FBQTs7WUFDMUIsSUFBRzs7QUFJRixnQkFBQSxJQUFJLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQ3pDLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQUM7Z0JBRUYsSUFBSSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTlDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNuQixhQUFBO0FBQUMsWUFBQSxPQUFNLENBQUMsRUFBQztBQUNULGdCQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsZ0JBQUEsSUFBSUUsZUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNyQixhQUFBO1NBQ0QsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVPLGdCQUFnQixHQUFBOztRQUV2QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQzdDLFFBQUEsU0FBUyxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUM7QUFDbkMsUUFBQSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFDL0IsUUFBQSxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7O0FBR3RDLFFBQUEsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDN0MsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBRWxCLFFBQUEsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQU8sRUFBRSxFQUFFLE1BQU0sS0FBSSxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7OztBQUcvQyxZQUFBLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO0FBQzdDLFlBQUEsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDM0IsQ0FBQSxDQUFDLENBQUM7QUFDSCxRQUFBLE9BQU8sU0FBUyxDQUFDO0tBQ2pCO0lBRU8sb0JBQW9CLEdBQUE7QUFDM0IsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFFO0FBQ2hDLFlBQUEsTUFBTSxFQUFFO0FBQ1AsZ0JBQUEsT0FBTyxFQUFFLDhCQUE4QjtBQUN2QyxhQUFBO0FBQ0QsU0FBQSxDQUFFLENBQUM7S0FDSjtJQUVPLHdCQUF3QixHQUFBO0FBQy9CLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFOUMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFakIsTUFBTSxNQUFNLEdBQUcsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxPQUFjLEtBQUksU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO1lBQzdFLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMxRCxZQUFBLFlBQVksQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7QUFDaEMsWUFBQSxRQUFRLENBQUMsT0FBTyxDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBRTdCLElBQUssT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7OztBQUduRCxnQkFBQSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsV0FBVyxDQUFDO0FBQ3RDLGdCQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO2dCQUVwQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7QUFDckIsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBRSxpQ0FBaUMsQ0FBQyxRQUFRLENBQUUsQ0FBQztBQUMvRCxnQkFBQSxJQUFJQSxlQUFNLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUM3QyxhQUFBO0FBQ0YsU0FBQyxDQUFBLENBQUE7QUFFRCxRQUFBLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztZQUNsRCxTQUFTO0FBQ1QsWUFBQSxJQUFJLEVBQUUsZUFBZTtBQUNyQixZQUFBLFNBQVMsRUFBRSxJQUFJO0FBQ2YsWUFBQSxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssS0FBSTtnQkFDM0IsV0FBVyxHQUFHLEtBQUssQ0FBQztnQkFDcEIsWUFBWSxDQUFDLE9BQU8sQ0FBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUUsQ0FBQztBQUMzRCxnQkFBQSxRQUFRLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFFLENBQUM7YUFDL0Q7QUFDRCxZQUFBLGVBQWUsRUFBRSxDQUFDLEtBQUssS0FBSTtnQkFDMUIsV0FBVyxHQUFHLEtBQUssQ0FBQztBQUNwQixnQkFBQSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO29CQUMxQixRQUFRLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNsRCxpQkFBQTthQUNEO0FBQ0QsU0FBQSxDQUFDLENBQUM7QUFFSCxRQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztZQUM5QyxTQUFTO0FBQ1QsWUFBQSxJQUFJLEVBQUUsVUFBVTtBQUNoQixZQUFBLGdCQUFnQixFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMzQixPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNoQixZQUFZLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBRSxDQUFDO0FBQzNELGdCQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUUsQ0FBQzthQUMvRDtBQUNELFlBQUEsZUFBZSxFQUFFLENBQUMsS0FBSyxLQUFJO2dCQUMxQixPQUFPLEdBQUcsS0FBSyxDQUFDOztBQUVoQixnQkFBQSxNQUFNLGFBQWEsR0FBRyxXQUFXLEtBQUssT0FBTyxDQUFDO0FBQzlDLGdCQUFBLElBQUksYUFBYSxFQUFDO29CQUNqQixLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMvQyxpQkFBQTthQUNEO0FBQ0QsU0FBQSxDQUFDLENBQUM7QUFFSCxRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUlGLGdCQUFPLENBQUMsU0FBUyxDQUFDO2FBQ2xDLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDcEIsYUFBQSxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUk7QUFDZixZQUFBLEVBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQyxJQUFHO2dCQUNoQixPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ2IsYUFBQyxDQUFDLENBQUM7QUFDSixTQUFDLENBQUMsQ0FDRjtBQUNELFFBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSTtBQUN6QyxZQUFBLElBQUssRUFBRSxDQUFDLEdBQUcsS0FBSyxPQUFPLEVBQUc7Z0JBQ3pCLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNwQixnQkFBQSxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN0QyxhQUFBO0FBQ0YsU0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNuQixTQUFTLENBQUUsRUFBRSxJQUFHO1lBQ2pCLEVBQUU7QUFDQSxpQkFBQSxTQUFTLEVBQUU7aUJBQ1gsT0FBTyxDQUFDLE9BQU8sQ0FBQzs7aUJBRWhCLFVBQVUsQ0FBQyxRQUFRLENBQUM7aUJBQ3BCLE9BQU8sQ0FBRSxNQUFLO0FBQ2QsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBRSxpQ0FBaUMsQ0FBQyxRQUFRLENBQUUsQ0FBQztBQUNoRSxhQUFDLENBQUUsQ0FDSDtBQUNGLFNBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBRSxFQUFFLElBQUc7WUFDbEIsRUFBRTtBQUNBLGlCQUFBLE1BQU0sRUFBRTtpQkFDUixPQUFPLENBQUMsV0FBVyxDQUFDO2lCQUNwQixVQUFVLENBQUMsaUJBQWlCLENBQUM7O0FBRTdCLGlCQUFBLFVBQVUsRUFBRTtBQUNaLGlCQUFBLE9BQU8sQ0FBRSxDQUFDLEVBQUUsS0FBSTtBQUNoQixnQkFBQSxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2QyxhQUFDLENBQUUsQ0FDSDtBQUNGLFNBQUMsQ0FBQyxDQUNGO0FBRUQsUUFBQSxPQUFPLFNBQVMsQ0FBQztLQUNqQjtBQUVPLElBQUEsVUFBVSxDQUFFLElBQVcsRUFBQTtBQUM5QixRQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7WUFDbkIsT0FBTyxDQUFBLE1BQUEsRUFBUyxJQUFJLENBQUEsQ0FBRSxDQUFDO0FBQ3ZCLFNBQUE7QUFBSSxhQUFBO0FBQ0osWUFBQSxPQUFPLEVBQUUsQ0FBQztBQUNWLFNBQUE7S0FDRDtBQUVPLElBQUEsV0FBVyxDQUNsQixPQUEwQyxFQUFBOztBQUsxQyxRQUFBLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNqQyxRQUFBLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7QUFHbkMsUUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBRXZCLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFFM0IsUUFBUSxJQUFJLENBQUMsV0FBVztZQUN2QixLQUFLLGlDQUFpQyxDQUFDLE9BQU87QUFDN0MsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDMUIsTUFBTTtZQUVOLEtBQUssaUNBQWlDLENBQUMsV0FBVztBQUNqRCxnQkFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUM5QixNQUFNO1lBRU4sS0FBSyxpQ0FBaUMsQ0FBQyxRQUFRO0FBQzlDLGdCQUFBLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNqQyxnQkFBQSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbkMsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDekIsTUFBTTtZQUVOLEtBQUssaUNBQWlDLENBQUMsY0FBYztBQUNwRCxnQkFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7Z0JBQ25ELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUNqQyxNQUFNO0FBQ04sU0FBQTtLQUVEO0lBRUssd0JBQXdCLEdBQUE7O1lBQzdCLElBQUksUUFBUSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7O0FBSWpELFlBQUEsTUFBTSxhQUFhLEdBQUcsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUNqRCxRQUFRLEVBQ1IsSUFBSSxDQUFDLGtCQUFrQixDQUN2QixDQUFDO1lBRUYsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFDO0FBQzFCLGdCQUFBLElBQUlFLGVBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2hDLGFBQUE7QUFBSSxpQkFBQTtnQkFDSixzQkFBc0IsQ0FBQyxHQUFHLENBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDO0FBQy9GLGdCQUFBLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxhQUFhLENBQUM7QUFDdkMsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBRSxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM5RCxhQUFBO1NBRUQsQ0FBQSxDQUFBO0FBQUEsS0FBQTs7QUFHRCxJQUFBLGtCQUFrQixDQUFDLFNBQWlCLEVBQUE7O1FBRW5DLE9BQU8sU0FBUyxJQUFJLFdBQVcsQ0FBQztLQUNoQzs7SUFHRCxXQUFXLEdBQUE7QUFDVixRQUFBLE9BQU8sZ0NBQWdDLENBQUM7S0FDeEM7O0lBR1EsV0FBVyxDQUFDLElBQVksRUFBRSxLQUFjLEVBQUE7Ozs7Ozs7OztBQVVoRCxRQUFBLElBQUksS0FBSyxFQUFDO0FBRVQsWUFBQSxJQUFJLE9BQTJDLENBQUM7WUFDaEQsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFDOztBQUVmLGdCQUFBLE9BQU8sR0FBRyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUM7QUFDcEQsYUFBQTtBQUFJLGlCQUFBO0FBQ0osZ0JBQUEsT0FBTyxHQUFHLGlDQUFpQyxDQUFDLFdBQVcsQ0FBQztBQUN4RCxhQUFBOztBQUdELFlBQUEsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQzs7WUFHN0IsSUFBSSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVsRCxZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztBQUUxQixZQUFBLElBQUksQ0FBQyxXQUFXLENBQUUsT0FBTyxDQUFFLENBQUM7QUFFNUIsU0FBQTtBQUFJLGFBQUE7QUFDSixZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDbkIsWUFBQSxJQUFJQSxlQUFNLENBQUMsNERBQTRELENBQUMsQ0FBQztBQUN6RSxTQUFBO0tBRUQ7O0lBR1EsV0FBVyxHQUFBOzs7OztRQU1uQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDakI7SUFFUSxLQUFLLEdBQUE7O0tBRWI7QUFHRCxDQUFBO0FBRUQsTUFBTSxRQUFRLENBQUE7SUFNYixXQUFhLENBQUEsSUFBVyxFQUFFLFdBQWtCLEVBQUE7UUFKckMsSUFBTyxDQUFBLE9BQUEsR0FBWSxLQUFLLENBQUM7QUFLL0IsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUNqQixRQUFBLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0tBQy9CO0FBQ0QsQ0FBQTtBQUVELE1BQU0sY0FBYyxDQUFBO0FBRVosSUFBQSxPQUFhLE1BQU0sQ0FBRSxJQUFZLEVBQUUsSUFBVyxFQUFFLElBQVcsRUFBQTs7QUFDakUsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xDLE1BQU0sYUFBYSxHQUFHLE1BQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0QsWUFBQSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztTQUN6QyxDQUFBLENBQUE7QUFBQSxLQUFBO0FBRU0sSUFBQSxPQUFhLE9BQU8sQ0FBRSxJQUFjLEVBQUUsSUFBVyxFQUFBOztBQUN2RCxZQUFBLElBQUssSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFLEVBQUU7QUFDNUIsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDVixhQUFBO0FBQ0QsWUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xDLE9BQU8sTUFBTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM5RCxDQUFBLENBQUE7QUFBQSxLQUFBO0FBQ0QsQ0FBQTtBQUVELE1BQU0sZ0JBQWdCLENBQUE7SUFFZCxPQUFPLE1BQU0sQ0FBRSxJQUFjLEVBQUE7UUFDbkMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDckM7SUFFTSxPQUFPLE1BQU0sQ0FBRSxXQUFrQixFQUFBOztRQUV2QyxJQUFJLFdBQVcsS0FBSyxFQUFFLEVBQUM7QUFDdEIsWUFBQSxPQUFPLElBQUksUUFBUSxDQUFFLEVBQUUsRUFBRSxFQUFFLENBQUUsQ0FBQztBQUM5QixTQUFBO0FBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFhLENBQUM7S0FDM0M7QUFDRDs7QUN4aUJhLE1BQU8sdUJBQXVCLENBQUE7SUFPckMsTUFBTSxDQUFFLE1BQW1CLEVBQUUsUUFBbUMsRUFBQTs7QUFDckUsWUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUNyQixZQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLHVCQUF1QixDQUFDO1lBQ2pELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBRTNCLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQ3ZCLGdDQUFnQyxFQUNoQyxDQUFDLElBQUksS0FBSyxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUM1QyxDQUFDO1lBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFFaEYsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUN0QixnQkFBQSxFQUFFLEVBQUUsOEJBQThCO0FBQ2xDLGdCQUFBLElBQUksRUFBRSwyQkFBMkI7QUFDakMsZ0JBQUEsSUFBSSxFQUFFLE1BQU07Z0JBQ1osYUFBYSxFQUFFLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxRQUFRLENBQUM7QUFDaEYsYUFBQSxDQUFDLENBQUM7U0FFSCxDQUFBLENBQUE7QUFBQSxLQUFBO0lBRUQsUUFBUSxHQUFBO1FBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLGdDQUFnQyxDQUFDLENBQUM7S0FDL0U7QUFFTyxJQUFBLG9DQUFvQyxDQUFDLFFBQWlCLEVBQUE7O1FBRTdELElBQUc7QUFDRixZQUFBLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxFQUFDO0FBQzlDLGdCQUFBLE9BQU8sSUFBSSxDQUFDO0FBQ1osYUFBQTtZQUVELElBQUksV0FBVyxHQUFHRyxlQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUU1RSxZQUFBLElBQUksYUFBdUIsQ0FBQztBQUM1QixZQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUU3RCxJQUFJLFVBQVUsSUFBSSxJQUFJLEVBQUM7QUFDdEIsZ0JBQUEsYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUUsYUFBQTtBQUFJLGlCQUFBO0FBQ0osZ0JBQUEsYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqRSxhQUFBO0FBRUQsWUFBQSxNQUFNLFdBQVcsR0FBR0Msc0JBQWEsQ0FBRSxhQUFhLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUUsQ0FBQzs7QUFHNUUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFFO0FBQ3JELGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUUsS0FBSyxDQUFFLENBQUM7QUFDeEQsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQztBQUNwQixhQUFDLENBQUMsQ0FBQyxLQUFLLENBQUUsTUFBTSxJQUFHO0FBQ2xCLGdCQUFBLElBQUlKLGVBQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDM0IsYUFBQyxDQUFDLENBQUM7QUFFSCxZQUFBLE9BQU8sSUFBSSxDQUFDO0FBQ1osU0FBQTtBQUFBLFFBQUEsT0FBTSxDQUFDLEVBQUM7QUFDUixZQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsWUFBQSxJQUFJQSxlQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3JCLFNBQUE7S0FDRDtJQUVELGVBQWUsQ0FDZCxXQUF3QixFQUN4QixtQkFBeUMsRUFBQTtRQUd6QyxJQUFJRixnQkFBTyxDQUFDLFdBQVcsQ0FBQztBQUN0QixhQUFBLFVBQVUsRUFBRTthQUNaLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUMxQztRQUVELElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQzthQUN6QyxPQUFPLENBQUMsaUVBQWlFLENBQUM7YUFDMUUsU0FBUyxDQUFFLE1BQU0sSUFBRztZQUVwQixNQUFNO0FBQ0osaUJBQUEsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUM7QUFFakQsaUJBQUEsUUFBUSxDQUFFLENBQU0sS0FBSyxLQUFHLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUN4QixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixHQUFHLEtBQUssQ0FBQztnQkFDaEQsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzthQUMzQixDQUFBLENBQUMsQ0FDRjtBQUNGLFNBQUMsQ0FBQyxDQUNGO0tBQ0Q7SUFFTSxtQkFBbUIsR0FBQTtBQUN6QixRQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBQzs7QUFFM0MsWUFBQSxJQUFJLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLEVBQUM7QUFDeEMsZ0JBQUEsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFFLE1BQU0sRUFBRSwyQkFBMkIsRUFBRSxDQUFDLEVBQUUsS0FBRztBQUNwRyxvQkFBQSxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsaUJBQUMsQ0FBQyxDQUFDO0FBQ0gsYUFBQTtBQUNELFNBQUE7QUFBSSxhQUFBOztBQUVKLFlBQUEsSUFBSSxJQUFJLENBQUMsdUJBQXVCLElBQUksSUFBSSxFQUFDO0FBQ3hDLGdCQUFBLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN0QyxnQkFBQSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDO0FBQ3BDLGFBQUE7QUFDRCxTQUFBO0tBQ0Q7QUFDRDs7QUMvR29CLE1BQUEsV0FBWSxTQUFRTyxlQUFNLENBQUE7QUFBL0MsSUFBQSxXQUFBLEdBQUE7O1FBSVMsSUFBZSxDQUFBLGVBQUEsR0FBaUMsRUFBRSxDQUFDO0tBdUUzRDtJQXJFTSxNQUFNLEdBQUE7OztBQUdYLFlBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFJMUIsWUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDeEIsSUFBSSx1QkFBdUIsRUFBRSxFQUM3QixJQUFJLHFCQUFxQixFQUFFLENBQzNCLENBQUM7WUFFRixJQUFJLENBQUMsYUFBYSxDQUNqQixJQUFJLHNCQUFzQixDQUN6QixJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksRUFDSixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxlQUFlLENBQ3BCLENBQ0QsQ0FBQzs7O1lBSUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBTSxDQUFDLEtBQUcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO2dCQUN0QyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQzthQUN0QyxDQUFBLENBQUMsQ0FBQztTQUVILENBQUEsQ0FBQTtBQUFBLEtBQUE7SUFFRCxRQUFRLEdBQUE7UUFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFNLENBQUMsS0FBRyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7WUFDdEMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ2IsQ0FBQSxDQUFDLENBQUM7S0FDSDtJQUVLLFlBQVksR0FBQTs7QUFDakIsWUFBQSxNQUFNLGdCQUFnQixHQUErQjtBQUNwRCxnQkFBQSxlQUFlLEVBQUUsSUFBSTtBQUNyQixnQkFBQSxnQkFBZ0IsRUFBRSxJQUFJO0FBQ3RCLGdCQUFBLHVCQUF1QixFQUFFLEVBQUU7QUFFM0IsZ0JBQUEsdUJBQXVCLEVBQUU7QUFDeEIsb0JBQUEseUJBQXlCLEVBQUUsSUFBSTtBQUMvQixpQkFBQTtBQUVELGdCQUFBLHFCQUFxQixFQUFDO0FBQ3JCLG9CQUFBLGtCQUFrQixFQUFFLEtBQUs7QUFDekIsb0JBQUEsY0FBYyxFQUFFLElBQUk7QUFDcEIsaUJBQUE7YUFDRCxDQUFBO0FBRUQsWUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQzVCLGdCQUFnQixFQUNoQixNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FDckIsQ0FBQzs7WUFHRixzQkFBc0IsQ0FBQyxTQUFTLENBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDO1lBQ25FLHNCQUFzQixDQUFDLGFBQWEsQ0FDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsSUFBSSxDQUFDO0FBQzFDLGtCQUFFLElBQUk7QUFDTixrQkFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUN2QyxDQUFDO1NBQ0YsQ0FBQSxDQUFBO0FBQUEsS0FBQTtJQUVLLFlBQVksR0FBQTs7WUFDakIsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNuQyxDQUFBLENBQUE7QUFBQSxLQUFBO0FBRUQ7Ozs7In0=
