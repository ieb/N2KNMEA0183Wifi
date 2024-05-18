import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);

/**
 * When there is a service worker, normal basic auth fails to work
 * So all requests that need auth must perform the auth explicitly, hence
 * the AdminRequest class that encapsulates the credentials and the AdminCredentials
 * component that handles login. Neither are exported and neither are used in properties.
 * Nothing really to stop other code accessing the sessionStorage, so protection is minimal...
 * but that is always the case inside 1 process.
 */

class AdminRequest {
  constructor(base) {
    this.base = base;
    this.loadCredentials();
  }

  async fetch(url, options) {
    const opts = options || {};
    opts.credentials = 'include';
    opts.headers = opts.headers || {};
    opts.headers.Authorization = `Basic ${btoa(this.authorization)}`;
    opts.headers.Origin = window.location;
    const ret = await fetch(new URL(url, this.base), opts);
    if (ret && ret.status === 401) {
      this.authorization = undefined;
    }
    return ret;
  }

  // eslint-disable-next-line class-methods-use-this
  async fetchWithCredentials(url, username, password) {
    const opts = {};
    opts.credentials = 'include';
    opts.headers = {};
    const auth = btoa(`${username}:${password}`);
    opts.headers.Authorization = `Basic ${auth}`;
    opts.headers.Origin = window.location;
    const ret = await fetch(new URL(url, this.base), opts);
    return ret;
  }

  needsCredentials() {
    return (this.authorization === undefined);
  }

  loadCredentials() {
    if (this.authorization === undefined) {
      this.authorization = sessionStorage.getItem('credentials');
      return (this.authorization !== undefined);
    }
    return true;
  }

  saveCredentials(username, password) {
    this.authorization = `${username}:${password}`;
    sessionStorage.setItem('credentials', this.authorization);
  }

  // eslint-disable-next-line class-methods-use-this
  logout() {
    sessionStorage.removeItem('credentials');
  }


  get username() {
    if (this.authorization) {
      return this.authorization.split(':')[0];
    }
    return '';
  }

  get password() {
    if (this.authorization) {
      return this.authorization.split(':', 2)[1];
    }
    return '';
  }
}

class AdminCredentals extends Component {
  constructor(props) {
    super();
    this.credentialsOk = props.credentialsOk;
    this.checkLoginUrl = props.checkLoginUrl;
    this.adminRequest = new AdminRequest(props.apiUrl);
    this.state = {
      username: this.adminRequest.username,
      password: this.adminRequest.password,
      showPw: false,
    };
    this.updateUsername = this.updateUsername.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
    this.showPassword = this.showPassword.bind(this);
    this.clickLogin = this.clickLogin.bind(this);
  }

  updateUsername(event) {
    this.setState({
      username: event.target.value,
      msg: '',
    });
  }

  updatePassword(event) {
    this.setState({
      password: event.target.value,
      msg: '',
    });
  }

  showPassword() {
    this.setState({
      showPw: !this.state.showPw,
      msg: '',
    });
  }

  async clickLogin() {
    this.setState({
      msg: 'checking...',
    });
    const response = await this.adminRequest.fetchWithCredentials(
      this.checkLoginUrl,
      this.state.username,
      this.state.password,
    );
    if (response.status === 200) {
      this.setState({
        msg: 'correct, reloading...',
      });
      await this.adminRequest.saveCredentials(this.state.username, this.state.password);
      await this.credentialsOk();
    } else {
      this.setState({
        msg: 'incorrect',
      });
    }
  }


  render() {
    const passwordType = this.state.showPw ? 'text' : 'password';
    const showPwClass = this.state.showPw ? 'fa fa-eye' : 'fa fa-eye-slash';
    return html`<div className="container">
                  <div className="login-box">
                      <div className="user-box">
                        <label>Username</label>
                        <input type="text" value=${this.state.username} onChange=${this.updateUsername} />
                      </div>
                      <div className="user-box">
                        <label>Password</label>
                        <input type=${passwordType} value=${this.state.password} onChange=${this.updatePassword} />
                        <span className="password-toggle-icon"><i className=${showPwClass}  onCLick=${this.showPassword} ></i></span>
                      </div>
                      <div className="user-box">
                          <button title="login" onClick=${this.clickLogin} >Login</button>
                      </div>
                      <div className="user-box message">
                          ${this.state.msg}
                      </div>
                  </div>
              </div>`;
  }
}

class AdminView extends Component {
  constructor(props) {
    super(props);
    this.apiUrl = props.apiUrl;
    this.state = {
      pauseButton: 'Pause',
      fileSystem: {},
      rebootMessage: '',
    };
    this.uploadReference = undefined;
    this.uploadPathReference = undefined;
    this.setUploadRef = this.setUploadRef.bind(this);
    this.setPathRef = this.setPathRef.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.clickUpload = this.clickUpload.bind(this);
    this.updateFileSystem = this.updateFileSystem.bind(this);
    this.rebootDevice = this.rebootDevice.bind(this);
    this.logout = this.logout.bind(this);
  }

  async componentDidMount() {
    await this.updateFileSystem();
  }



  async updateFileSystem() {
    const adminRequest = new AdminRequest(this.apiUrl);
    const response = await adminRequest.fetch('/api/fs.json');
    console.log('Response ', response);
    const dir = await response.json();
    console.log('Got Files', dir);
    this.setState({
      dir,
    });
  }

  async logout() {
    const adminRequest = new AdminRequest(this.apiUrl);
    await adminRequest.logout();
    this.setState({
      dir: {},
    });
  }

  async deleteFile(path) {
    console.log('Delete ', path);
    const details = {
      op: 'delete',
      path,
    };

    const formBody = [];
    for (const property of Object.keys(details)) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const body = formBody.join('&');
    const adminRequest = new AdminRequest(this.apiUrl);
    const response = await adminRequest.fetch('/api/fs.json', {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body,
    });
    const result = await response.json();
    console.log('Delete result ', result);
    await this.updateFileSystem();
  }

  async rebootDevice() {
    const body = '';
    const adminRequest = new AdminRequest(this.apiUrl);
    const response = await adminRequest.fetch('/api/reboot.json', {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body,
    });
    const result = await response.json();
    console.log('Reboot result ', result);
    let readyCountDown = 5;
    const countdown = async () => {
      if (readyCountDown > 0) {
        readyCountDown--;
        this.setState({
          rebootMessage: `device ready in ${readyCountDown}`,
        });
        setTimeout(countdown, 1000);
      } else {
        this.setState({
          rebootMessage: 'trying device',
        });
        try {
          await this.updateFileSystem();
          this.setState({
            rebootMessage: '',
          });
        } catch (e) {
          this.setState({
            rebootMessage: 'not ready, wait 1s and retry',
          });

          setTimeout(countdown, 1000);
        }
      }
    };
    this.setState({
      dir: undefined,
    });
    countdown();
  }


  setUploadRef(ref) {
    this.uploadReference = ref;
  }

  setPathRef(ref) {
    this.uploadPathReference = ref;
  }

  onFileChange() {
    if (this.uploadReference) {
      if (this.uploadPathReference) {
        let path = this.uploadReference.files[0].name;
        if (!path.startsWith('/')) {
          path = `/${path}`;
        }
        this.uploadPathReference.value = path;
      }
    }
  }

  async clickUpload() {
    console.log('Upload ');
    if (this.uploadReference && this.uploadReference.files[0]) {
      let path = `/${this.uploadReference.files[0].name}`;
      if (this.uploadPathReference && this.uploadPathReference.value) {
        path = this.uploadPathReference.value;
      }
      console.log('Uploading ', path, this.uploadReference.files);
      const formData = new FormData();
      formData.append('op', 'upload');
      formData.append('path', path);
      formData.append('file', this.uploadReference.files[0]);
      const adminRequest = new AdminRequest(this.apiUrl);
      const response = await adminRequest.fetch('/api/fs.json', {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        body: formData,
      });
      const result = await response.json();
      console.log('Upload result ', result);
      await this.updateFileSystem();
    } else {
      console.log('No file selected', this.uploadReferece.current);
    }
  }

  renderFile(n, fileInfo) {
    const clickDelete = () => {
      this.deleteFile(fileInfo.path);
    };
    const downloadUrl = `${this.apiUrl}${fileInfo.path}`;
    return html`<div className="line" key=${n}>
                      <div className="fileInfo">
                        <div><a href="${downloadUrl}" >${fileInfo.path}</a></div>
                        <div>${fileInfo.size}</div>
                        <div>
                            <button onClick=${clickDelete} title="delete ${fileInfo.path} ">-</button>
                        </div>
                      </div>
                    </div>`;
  }

  renderFileList() {
    const fileList = [];
    if (this.state.dir) {
      const { files } = this.state.dir;
      for (let x = 0; x < files.length; x++) {
        fileList.push(this.renderFile(x, files[x]));
      }
    }
    return fileList;
  }


  render() {
    let totalSize = 0; let usedSize = 0; let freeSize = 0;
    let heapFree = 0; let heapSize = 0; let heapMin = 0;
    let heapMaxAlloc = 0;
    const formatBytes = (b) => {
      if (b > 1 * 1024 * 1024) {
        return `${(b / (1024 * 1024)).toFixed(2)}MB`;
      } if (b > 1.2 * 1024) {
        return `${(b / (1024)).toFixed(1)}KB`;
      }
      return `${b.toFixed(0)}B`;
    };

    if (this.state.dir && this.state.dir.files) {
      totalSize = formatBytes(this.state.dir.disk.size);
      usedSize = formatBytes(this.state.dir.disk.used);
      freeSize = formatBytes(this.state.dir.disk.free);
      heapFree = formatBytes(this.state.dir.heap.free);
      heapSize = formatBytes(this.state.dir.heap.size);
      heapMin = formatBytes(this.state.dir.heap.minFree);
      heapMaxAlloc = formatBytes(this.state.dir.heap.maxAlloc);

      return html`
              <div className="adminview" >
              <div>
                  <input ref=${this.setUploadRef} type="file" onInput=${this.onFileChange} /> 
                  as
                  <input ref=${this.setPathRef} type="text" />
                  <button onClick=${this.clickUpload} title="Upload new file ">Upload</button>
                  <button onClick=${this.updateFileSystem} title="Refresh">Refresh</button>
                  <button onClick=${this.rebootDevice} title="Reboot">Reboot</button>
                  <button onClick=${this.logout} title="Logout">Logout</button>
                  ${this.state.rebootMessage}
              </div>
              <div className="logviewer">${this.renderFileList()}</div>
              <div>
                  Filesystem Total:${totalSize} Used:${usedSize} Free:${freeSize} Heap Size:${heapSize} Free:${heapFree} min:${heapMin} maxAlloc:${heapMaxAlloc}
              </div>
              </div> `;
    }

    return html`<${AdminCredentals} 
      credentialsOk=${this.updateFileSystem} 
      checkLoginUrl='/api/login.json'
      apiUrl=${this.apiUrl} />`;
  }
}

export { AdminView };
