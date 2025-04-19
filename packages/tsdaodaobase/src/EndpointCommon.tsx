import { Channel, WKSDK, Message ,MessageContentType} from "wukongimjssdk";
import WKApp from "./App";
import React, { Component, ReactNode } from "react";
import { ChatContentPage } from "./Pages/Chat";
import { EndpointCategory, EndpointID } from "./Service/Const";
import { EndpointManager } from "./Service/Module";
import ConversationContext from "./Components/Conversation/context";
import { copyImageToClipboard, isClipboardCopySupported } from "./Utils/copyImage";
import { Toast } from "@douyinfe/semi-ui";
import {ImageContent} from "./Messages/Image";

export class MessageContextMenus {
  title!: string;
  onClick?: () => void;
}

export class ShowConversationOptions {
  // 聊天消息定位的messageSeq
  initLocateMessageSeq?: number;
}

export class EndpointCommon {
  private _onLogins: VoidFunction[] = []; // 登录成功

  constructor() {
    this.registerShowConversation();
  }

  addOnLogin(v: VoidFunction) {
    this._onLogins?.push(v);
  }

  removeOnLogin(v: VoidFunction) {
    const len = this._onLogins.length;
    for (var i = 0; i < len; i++) {
      if (v === this._onLogins[i]) {
        this._onLogins.splice(i, 1);
        return;
      }
    }
  }

  showConversation(channel: Channel, opts?: ShowConversationOptions) {
    WKApp.shared.openChannel = channel;
    EndpointManager.shared.invoke(EndpointID.showConversation, {
      channel: channel,
      opts: opts,
    });
    WKApp.shared.notifyListener();
  }

  registerContactsHeader(
    id: string,
    callback: (param: any) => JSX.Element,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      id,
      (param) => {
        return callback(param);
      },
      {
        sort: sort,
        category: EndpointCategory.contactsHeader,
      }
    );
  }
  contactsHeaders(): JSX.Element[] {
    return EndpointManager.shared.invokes(EndpointCategory.contactsHeader);
  }

  private registerShowConversation() {
    EndpointManager.shared.setMethod(
      EndpointID.showConversation,
      (param: any) => {
        const channel = param.channel as Channel;
        let opts: ShowConversationOptions = {}
        if (param.opts) {
          opts = param.opts
        }

        let initLocateMessageSeq = 0;
        if (opts && opts.initLocateMessageSeq && opts.initLocateMessageSeq > 0) {
          initLocateMessageSeq = opts.initLocateMessageSeq;
        }

        if (initLocateMessageSeq <= 0) {
          const conversation =
            WKSDK.shared().conversationManager.findConversation(channel);
          if (
            conversation &&
            conversation.lastMessage &&
            conversation.unread > 0 &&
            conversation.lastMessage.messageSeq > conversation.unread
          ) {
            initLocateMessageSeq =
              conversation.lastMessage.messageSeq - conversation.unread;
          }
        }

        let key = channel.getChannelKey()
        if (initLocateMessageSeq > 0) {
          key = `${key}-${initLocateMessageSeq}`
        }

        WKApp.routeRight.replaceToRoot(
          <ChatContentPage
            key={channel.getChannelKey()}
            channel={channel}
            initLocateMessageSeq={initLocateMessageSeq}
          ></ChatContentPage>
        );
      },
      {}
    );
  }

  registerMessageContextMenus(
    sid: string,
    handle: (
      message: Message,
      context: ConversationContext
    ) => MessageContextMenus | null,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      sid,
      (param: any) => {
        return handle(param.message, param.context);
      },
      {
        category: EndpointCategory.messageContextMenus,
        sort: sort,
      }
    );
  }

  messageContextMenus(
      message: Message,
      ctx: ConversationContext
  ): MessageContextMenus[] {
    const menus: MessageContextMenus[] = [];

    try {
      // 添加图片复制菜单（仅当浏览器支持时显示）
      if (message.contentType === MessageContentType.image) {
        const imageContent = message.content as ImageContent;
        const imageUrl = WKApp.dataSource.commonDataSource.getImageURL(imageContent.url);

        // 复制功能
        if (isClipboardCopySupported()) {
          menus.push({
            title: "复制图片",
            onClick: async () => {
              try {
                Toast.info({
                  content: "正在复制...",
                  duration: 2,
                });

                // 增加重试机制
                let result = false;
                for (let i = 0; i < 2; i++) {
                  result = await copyImageToClipboard(imageUrl);
                  if (result) break;
                  // 如果第一次失败，稍微延迟后重试
                  if (i === 0) await new Promise(r => setTimeout(r, 500));
                }

                if (result) {
                  Toast.success({
                    content: "图片已复制，可以粘贴使用了",
                    duration: 3,
                  });
                } else {
                  // 提供备用建议
                  Toast.error({
                    content: "复制失败，请稍后重试",
                    duration: 4,
                  });
                }
              } catch (err) {
                console.error('复制图片失败:', err);
                Toast.error("复制失败，请稍后重试");
              }
            }
          });
        }
      }
    } catch (e) {
      console.error('构建图片菜单失败:', e);
    }

    // 添加撤回菜单
    if (
        message.fromUID === WKApp.loginInfo.uid &&
        new Date().getTime() / 1000 - message.timestamp <
        WKApp.remoteConfig.revokeSecond
    ) {
      menus.push({
        title: "撤回",
        onClick: () => {
          ctx.revokeMessage(message);
        }
      });
    }

    // 添加自定义菜单
    const endpointMenus = EndpointManager.shared.invokes<MessageContextMenus>(
        EndpointCategory.messageContextMenus,
        {
          message: message,
          context: ctx,
        }
    );

    return [...menus, ...endpointMenus];
  }


  registerChatToolbar(
    sid: string,
    handle: (ctx: ConversationContext) => React.ReactNode | undefined
  ) {
    EndpointManager.shared.setMethod(
      sid,
      (param) => {
        return handle(param);
      },
      {
        category: EndpointCategory.chatToolbars,
      }
    );
  }

  chatToolbars(ctx: ConversationContext): React.ReactNode[] {
    return EndpointManager.shared.invokes(EndpointCategory.chatToolbars, ctx);
  }

  registerChannelHeaderRightItem(
    id: string,
    callback: (param: any) => JSX.Element | undefined,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      id,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.channelHeaderRightItems,
        sort: sort,
      }
    );
  }

  channelHeaderRightItems(channel: Channel): JSX.Element[] {
    return EndpointManager.shared.invokes(
      EndpointCategory.channelHeaderRightItems,
      { channel: channel }
    );
  }

  organizationalTool(
      channel: Channel,
      disableSelectList?: string[],
      render?: JSX.Element
  ): JSX.Element {
    return EndpointManager.shared.invoke(EndpointCategory.organizational, {
      channel,
      disableSelectList,
      render,
    });
  }

  registerOrganizationalTool(
    sid: string,
    callback: (param: any) => JSX.Element | undefined
  ) {
    EndpointManager.shared.setMethod(
      EndpointCategory.organizational,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.organizational,
      }
    );
  }

  organizationalLayer(channel: Channel, disableSelectList?: string[]): void {
    return EndpointManager.shared.invoke(EndpointCategory.organizationalLayer, {
      channel,
      disableSelectList,
    });
  }

  registerOrganizationalLayer(sid: string, callback: (param: any) => void) {
    EndpointManager.shared.setMethod(
      EndpointCategory.organizationalLayer,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.organizational,
      }
    );
  }

  callOnLogin() {
    const len = this._onLogins.length;
    for (var i = 0; i < len; i++) {
      this._onLogins[i]();
    }
  }
}

export class ChatToolbar {
  icon!: string;
  onClick?: () => void;
}
