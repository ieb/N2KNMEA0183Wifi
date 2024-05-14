import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);

class AdminView extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.apiUrl = `http://${props.host}`;
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
  }

  async componentDidMount() {
    await this.updateFileSystem();
  }

  async updateFileSystem() {
    const response = await fetch(`${this.apiUrl}/api/fs.json`, {
      credentials: 'include',
    });
    console.log('Response ', response);
    const dir = await response.json();
    console.log('Got Files', dir);
    this.setState({
      dir,
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
    const response = await fetch(`${this.apiUrl}/api/fs.json`, {
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
    const response = await fetch(`${this.apiUrl}/api/reboot.json`, {
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
      const response = await fetch(`${this.apiUrl}/api/fs.json`, {
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

    if (this.state.dir) {
      totalSize = formatBytes(this.state.dir.disk.size);
      usedSize = formatBytes(this.state.dir.disk.used);
      freeSize = formatBytes(this.state.dir.disk.free);
      heapFree = formatBytes(this.state.dir.heap.free);
      heapSize = formatBytes(this.state.dir.heap.size);
      heapMin = formatBytes(this.state.dir.heap.minFree);
      heapMaxAlloc = formatBytes(this.state.dir.heap.maxAlloc);
    }
    return html`
            <div className="adminview" >
            <div>
                <input ref=${this.setUploadRef} type="file" onInput=${this.onFileChange} /> 
                as
                <input ref=${this.setPathRef} type="text" />
                <button onClick=${this.clickUpload} title="Upload new file ">Upload</button>
                <button onClick=${this.updateFileSystem} title="Refresh">Refresh</button>
                <button onClick=${this.rebootDevice} title="Reboot">Reboot</button>
                ${this.state.rebootMessage}
            </div>
            <div className="logviewer">${this.renderFileList()}</div>
            <div>
                Filesystem Total:${totalSize} Used:${usedSize} Free:${freeSize} Heap Size:${heapSize} Free:${heapFree} min:${heapMin} maxAlloc:${heapMaxAlloc}
            </div>
            </div> `;
  }
}

export { AdminView };
