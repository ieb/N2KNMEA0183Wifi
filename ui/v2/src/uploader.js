import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);

class Uploader extends Component {
  constructor(props) {
    super(props);
    this.onUpload = props.onUpload;
    this.placeholder = props.placeholder;
    this.nameLabel = props.nameLabel;
    this.uploadLabel = props.uploadLabel;
    this.acceptTypes = props.acceptTypes || 'application/json';

    this.state = {
      uploadName: props.uploadName || '',
      uploadErrorMessage: props.uploadErrorMessage || 'Testing an error message for layout',
    };

    this.upload = this.upload.bind(this);
    this.cancel = this.cancel.bind(this);
    this.onChangeName = this.onChangeName.bind(this);
    this.onChangeFile = this.onChangeFile.bind(this);
  }

  async upload() {
    if (this.fileUpload
      && this.state.uploadName.trim() !== '') {
      await this.onUpload('upload', this.state.uploadName, this.fileUpload);
    } else {
      this.setState({
        uploadErrorMessage: 'Name and file are required',
      });
    }
  }

  cancel() {
    this.onUpload('cancel');
  }

  onChangeName(e) {
    this.setState({
      uploadName: e.target.value,
    });
  }

  onChangeFile(e) {
    if (e.target.files.length === 1) {
      // eslint-disable-next-line prefer-destructuring
      this.fileUpload = e.target.files[0];
      this.setState({
        uploadErrorMessage: '',
      });
    }
  }

  render() {
    return html`<div class="uploadControl">
        <div class="content">
          <div>
          <label for="upload-name">${this.nameLabel}</label>
          <input id="upload-name" 
            type="text" 
            onChange=${this.onChangeName}
            value=${this.state.uploadName}
            required="true"
            placeholder=${this.placeholder}
            name="uploadName" />
          <label for="upload-file">${this.uploadLabel}</label>
          <input 
            id="upload-file" 
            type="file" 
            required="true"
            accept=${this.acceptTypes}
            onChange=${this.onChangeFile}
            name="upload-file" />
          <button id="upload-button" onClick=${this.upload}> Upload </button>
          <button id="upload-button" onClick=${this.cancel}> Cancel </button>
          </div>
          <div class="errorMessage">
            ${this.state.uploadErrorMessage}
          </div>
        </div>
      </div>`;
  }
}


export { Uploader };
