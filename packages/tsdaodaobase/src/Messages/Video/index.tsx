import { MediaMessageContent } from "wukongimjssdk"
import React from "react"
import WKApp from "../../App"
import { MessageContentTypeConst } from "../../Service/Const"
import MessageBase from "../Base"
import { MessageCell } from "../MessageCell"


export class VideoContent extends MediaMessageContent {
    width!: number
    height!: number
    videoData?: string
    second!: number // 小视频秒长

    url!: string
    cover!: string // 小视频封面图片下载地址
    constructor(file?: File, coverFile?: any, videoData?: string, width?: number, height?: number, second?: number) {
        super()
        this.width = width || 0
        this.height = height || 0
        this.videoData = videoData
        this.second = second || 0

        this.file = file
        this.coverFile = coverFile
    }
    decodeJSON(content: any) {
        this.width = content["width"] || 0
        this.height = content["height"] || 0
        this.second = content["second"] || 0

        this.url = content["url"]
        this.cover = content["cover"]
        this.remoteUrl = this.url

        this.coverUrl = this.cover
    }
    encodeJSON() {
        return { "width": this.width || 0, "height": this.height || 0, "url": this.remoteUrl, "cover": this.coverUrl, "second": this.second, }
    }


    get contentType() {
        return MessageContentTypeConst.smallVideo
    }
    get conversationDigest() {
        return "[小视频]"
    }
}



interface VideoCellState {
    playProgress: number // 播放进度
}

export class VideoCell extends MessageCell<any, VideoCellState> {

    constructor(props: any) {
        super(props)
        this.state = {
            playProgress: 0,
        }
    }
    secondFormat(second: number): string {
        const minute = parseInt(`${(second / 60)}`)
        const realSecond = parseInt(`${second % 60}`)
        let minuteFormat = ""
        if (minute > 9) {
            minuteFormat = `${minute}`
        } else {
            minuteFormat = `0${minute}`
        }
        let secondFormat = ""
        if (realSecond > 9) {
            secondFormat = `${realSecond}`
        } else {
            secondFormat = `0${realSecond}`
        }

        return `${minuteFormat}:${secondFormat}`
    }


    videoScale(orgWidth: number, orgHeight: number, maxWidth = 380, maxHeight = 380) {
        let actSize = { width: orgWidth, height: orgHeight };
        if (orgWidth > orgHeight) {//横图
            if (orgWidth > maxWidth) { // 横图超过最大宽度
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        } else if (orgWidth < orgHeight) { //竖图
            if (orgHeight > maxHeight) {
                let rate = maxHeight / orgHeight; // 缩放比例
                actSize.width = orgWidth * rate;
                actSize.height = maxHeight;
            }
        } else if (orgWidth === orgHeight) {
            if (orgWidth > maxWidth) {
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        }
        return actSize;
    }

    render() {
        const { message, context } = this.props
        const { playProgress } = this.state
        const content = message.content as VideoContent
        const actSize = this.videoScale(content.width, content.height)
        return <MessageBase hiddeBubble={true} message={message} context={context}>
            <div className="wk-message-video" style={{ width: actSize.width, height: '100%' }}>
                <div className="wk-message-video-content">
                    <span className="wk-message-video-content-time" style={{ color: '#000' }}>{this.secondFormat((content?.second || content.second || 0) - (playProgress || 0))}</span>
                    <div className="wk-message-video-content-video">
                        <video
                            poster={WKApp.dataSource.commonDataSource.getImageURL(content?.coverUrl || content.cover)}
                            width={actSize.width}
                            height={actSize.height} controls
                            onTimeUpdate={(evet) => {
                                const video = evet.target as HTMLVideoElement
                                this.setState({
                                    playProgress: video.currentTime,
                                })
                            }} onEnded={() => {
                                this.setState({
                                    playProgress: 0,
                                })
                            }}
                            src={WKApp.dataSource.commonDataSource.getFileURL(content?.remoteUrl || content.url)}
                        >
                            <source src={WKApp.dataSource.commonDataSource.getFileURL(content?.remoteUrl || content.url)} type="video/mp4" />
                        </video>
                    </div>
                </div>
            </div>
        </MessageBase>
    }
}