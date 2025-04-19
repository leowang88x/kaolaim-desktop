import { ConversationContext, FileHelper, VideoContent, WKApp } from "@tsdaodao/base";
import React from "react";
import { Component, ReactNode } from "react";

import "./index.css"


interface ImageToolbarProps {
    conversationContext: ConversationContext
    icon: string
}

interface ImageToolbarState {
    showDialog: boolean
    file?: any
    coverFile?: any
    fileType?: string
    previewUrl?: any,
    fileIconInfo?: any,
    canSend?: boolean
    width?: number
    height?: number
    currentTime?: number
    second?: number
    cover?: any
    url?: any
}

export default class ImageToolbar extends Component<ImageToolbarProps, ImageToolbarState> {
    pasteListen!: (event: any) => void
    constructor(props: any) {
        super(props)
        this.state = {
            showDialog: false,
        }
    }

    componentDidMount() {
        let self = this;

        const { conversationContext } = this.props

        this.pasteListen = function (event: any) { // 监听粘贴里的文件
            let files = event.clipboardData.files;
            if (files.length > 0) {
                self.showFile(files[0]);
            }
        }
        document.addEventListener('paste', this.pasteListen)
        conversationContext.setDragFileCallback((file) => {
            self.showFile(file);
        })
    }

    componentWillUnmount() {
        document.removeEventListener("paste", this.pasteListen)
    }

    $fileInput: any
    onFileClick = (event: any) => {
        event.target.value = '' // 防止选中一个文件取消后不能再选中同一个文件
    }
    onFileChange() {
        let file = this.$fileInput.files[0];
        this.showFile(file);
    }
    chooseFile = () => {
        this.$fileInput.click();
    }
    async createCover(file: any) {
        const videoFile = file;
        const canvas = document.createElement('canvas');
        const newVideo = document.createElement('video');

        // 先设置视频源
        newVideo.src = URL.createObjectURL(videoFile);
        // 设置视频属性
        newVideo.muted = true;
        newVideo.autoplay = false;

        // 监听 canplay 事件，确保视频可以播放
        await new Promise((resolve) => {
            const handleCanPlay = () => {
                newVideo.removeEventListener('canplay', handleCanPlay);
                // 跳到 0.1 秒处
                newVideo.currentTime = 0.1;
                resolve(null);
            };
            newVideo.addEventListener('canplay', handleCanPlay);
        });

        // 监听 seeked 事件，确保视频已经跳到指定时间点
        await new Promise((resolve) => {
            const handleSeeked = () => {
                newVideo.removeEventListener('seeked', handleSeeked);
                resolve(null);
            };
            newVideo.addEventListener('seeked', handleSeeked);
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('无法获取 canvas 上下文');
            return;
        }

        canvas.width = newVideo.videoWidth;
        canvas.height = newVideo.videoHeight;
        ctx.drawImage(newVideo, 0, 0, canvas.width, canvas.height);

        const blob: any = await new Promise((resolve) => canvas.toBlob((b) => b && resolve(b), 'image/jpeg'));
        const coverFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
        this.setState({
            coverFile: coverFile,
            cover: coverFile,
        })
        // console.log(coverFile, "coverFile==================================");

        // // 下载截取的封面
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = 'cover.jpg';
        // a.click();
        // URL.revokeObjectURL(url);
    }
    async showFile(file: any) {
        const self = this
        if (file.type && file.type.startsWith('video/')) {
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = function (e: any) {
                self.setState({
                    file: file,
                    fileType: "video",
                    previewUrl: reader.result,
                    showDialog: true,
                });
            };
        }
        this.createCover(file)
    }

    async onSend() {
        const { conversationContext } = this.props
        const { file, coverFile, previewUrl, width, height, fileType, second } = this.state
        if (fileType === "video") {
            conversationContext.sendMessage(new VideoContent(file, coverFile, previewUrl, width, height, second))
        }
        this.setState({
            showDialog: false,
        });
    }
    
    async onPreviewLoad(e: any) {
        const video = e.target;
        const handleSeeked = async () => {
            let videoFile = this.state.file;
            const canvas = document.createElement('canvas');
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            await new Promise((resolve) => {
                video.onloadeddata = () => resolve(null);
            });
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            this.setState({
                width: canvas.width,
                height: canvas.height,
                second: video.duration || 0,
                canSend: true,
                url: videoFile,
            });
            video.removeEventListener('seeked', handleSeeked);
        };

        const handleLoadedMetadata = () => {
            video.currentTime = 0;
            video.addEventListener('seeked', handleSeeked);
        };

        if (video.readyState >= 1) {
            // 如果视频元数据已经加载完成
            handleLoadedMetadata();
        } else {
            // 否则监听 loadedmetadata 事件
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
        }
        return;
    }
    render(): ReactNode {
        const { icon } = this.props
        const { showDialog, canSend, fileIconInfo, file, fileType, previewUrl } = this.state
        return <div className="wk-imagetoolbar" >
            <div className="wk-imagetoolbar-content" onClick={() => {
                this.chooseFile()
            }}>
                <div className="wk-imagetoolbar-content-icon">
                    <img src={icon}></img>
                    <input onClick={this.onFileClick} onChange={this.onFileChange.bind(this)} ref={(ref) => { this.$fileInput = ref }} type="file" multiple={false} accept="video/*" style={{ display: 'none' }} />
                </div>
            </div>
            {
                showDialog ? (
                    <VideoDialog onSend={this.onSend.bind(this)} onLoad={this.onPreviewLoad.bind(this)} canSend={canSend} fileIconInfo={fileIconInfo} file={file} fileType={fileType} previewUrl={previewUrl} onClose={() => {
                        this.setState({
                            showDialog: !showDialog
                        })
                    }} />
                ) : null
            }
        </div>
    }
}


interface VideoDialogProps {
    onClose: () => void
    onSend?: () => void
    fileType?: string // image, file
    previewUrl?: string
    file?: any
    fileIconInfo?: any,
    canSend?: boolean
    onLoad: (e: any) => void
}

class VideoDialog extends Component<VideoDialogProps> {


    // 格式化文件大小
    getFileSizeFormat(size: number) {
        if (size < 1024) {
            return `${size} B`
        }
        if (size > 1024 && size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`
        }
        if (size > 1024 * 1024 && size < 1024 * 1024 * 1024) {
            return `${(size / 1024 / 1024).toFixed(2)} M`
        }
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)}G`
    }

    render() {
        const { onClose, onSend, fileType, previewUrl, file, canSend, fileIconInfo, onLoad } = this.props
        return <div className="wk-imagedialog">
            <div className="wk-imagedialog-mask" onClick={onClose}></div>
            <div className="wk-imagedialog-content">
                <div className="wk-imagedialog-content-close" onClick={onClose}>
                    <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2683" ><path d="M568.92178541 508.23169412l299.36805789-299.42461715a39.13899415 39.13899415 0 0 0 0-55.1452591L866.64962537 152.02159989a39.13899415 39.13899415 0 0 0-55.08869988 0L512.19286756 451.84213173 212.76825042 151.90848141a39.13899415 39.13899415 0 0 0-55.0886999 0L155.98277331 153.54869938a38.46028327 38.46028327 0 0 0 0 55.08869987L455.46394971 508.23169412 156.03933259 807.71287052a39.13899415 39.13899415 0 0 0 0 55.08869986l1.64021795 1.6967772a39.13899415 39.13899415 0 0 0 55.08869988 0l299.42461714-299.48117638 299.36805793 299.42461714a39.13899415 39.13899415 0 0 0 55.08869984 0l1.6967772-1.64021796a39.13899415 39.13899415 0 0 0 0-55.08869987L568.86522614 508.17513487z" p-id="2684"></path></svg>
                </div>
                <div className="wk-imagedialog-content-title">发送{fileType === 'video' ? '视频' : '文件'}</div>
                <div className="wk-imagedialog-content-body">
                    {
                        fileType === 'video' ? (
                            <div className="wk-imagedialog-content-preview">
                                <video
                                    className="wk-imagedialog-content-previewImg"
                                    controls onTimeUpdate={(evet) => {
                                        const video = evet.target as HTMLVideoElement
                                        this.setState({
                                            playProgress: video.currentTime,
                                            second: video.duration,
                                        })
                                    }} onEnded={() => {
                                        this.setState({
                                            playProgress: 0,
                                        })
                                    }} src={previewUrl} onLoadedData={onLoad}  >
                                    <source type="video/mp4" src={previewUrl} />
                                </video>
                            </div>
                        ) : (
                            <div className="wk-imagedialog-content-preview">
                                <div className="wk-imagedialog-content-preview-file">
                                    <div className="wk-imagedialog-content-preview-file-icon" style={{ backgroundColor: fileIconInfo?.color }}>
                                        <img alt="" className="wk-imagedialog-content-preview-file-thumbnail" src={fileIconInfo?.icon} />
                                    </div>
                                    <div className="wk-imagedialog-content-preview--filecontent">
                                        <div className="wk-imagedialog-content-preview--filecontent-name">{file?.name}</div>
                                        <div className="wk-imagedialog-content-preview--filecontent-size">{this.getFileSizeFormat(file?.size)}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    <div className="wk-imagedialog-footer" >
                        <button onClick={onClose}>取消</button>
                        <button onClick={onSend} className="wk-imagedialog-footer-okbtn" style={{ backgroundColor: canSend ? WKApp.config.themeColor : 'gray' }}>发送</button>
                    </div>
                </div>

            </div>
        </div>
    }
}