import './Markup.scss';

import CodeBlock from './markup/CodeBlock';
import Spoiler from './markup/Spoiler';

import {
  addTextSpans,
  Entity,
  parseMarkup,
  Span,
  UnreachableCaseError,
} from '@nerimity/nevula';
import { JSXElement, lazy } from 'solid-js';
import { emojiShortcodeToUnicode, emojiUnicodeToShortcode, unicodeToTwemojiUrl } from '@/emoji';
import { Emoji } from './markup/Emoji';
import useChannels from '@/chat-api/store/useChannels';
import { MentionChannel } from './markup/MentionChannel';
import useUsers from '@/chat-api/store/useUsers';
import { MentionUser } from './markup/MentionUser';
import { Message } from '@/chat-api/store/useMessages';

export interface Props {
  text: string;
  message?: Message;
}

type RenderContext = {
  props: () => Props;
  textCount: number;
  emojiCount: number;
};

const transformEntities = (entity: Entity, ctx: RenderContext) =>
  entity.entities.map((e) => transformEntity(e, ctx));

const sliceText = (ctx: RenderContext, span: Span, { countText = true } = {}) => {
  const text = ctx.props().text.slice(span.start, span.end);
  if (countText && !/^\s+$/.test(text)) {
    ctx.textCount += text.length;
  }
  return text;
};

type CustomEntity = Entity & { type: "custom" };

function transformCustomEntity(entity: CustomEntity, ctx: RenderContext) {
  const channels = useChannels();
  const users = useUsers();
  const type = entity.params.type;
  const expr = sliceText(ctx, entity.innerSpan, { countText: false });
  switch (type) {
    case "#": {
      const channel = channels.get(expr);
      if (channel && channel.serverId) {
        ctx.textCount += expr.length;
        return <MentionChannel channel={channel}/>;
      }
      break;
    }
    case "@": {
      const message = ctx.props().message;
      const user = message?.mentions?.find(u => u.id === expr) || users.get(expr);
      if (user) {
        ctx.textCount += expr.length;
        return <MentionUser user={user}/>;
      }
      break;
    }
    default: {
      console.warn("Unknown custom entity:", type);
    }
  }
  return <span>{sliceText(ctx, entity.outerSpan)}</span>;
}



function transformEntity(entity: Entity, ctx: RenderContext) {
  switch (entity.type) {
    case 'text': {
      if (entity.entities.length > 0) {
        return <span>{transformEntities(entity, ctx)}</span>;
      } else {
        return <span>{sliceText(ctx, entity.innerSpan)}</span>;
      }
    }
    case 'link': {
      const url = sliceText(ctx, entity.innerSpan);
      return <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>;
    }
    case "code": {
      return <code class={entity.type}>{transformEntities(entity, ctx)}</code>;
    }
    case "spoiler": {
      return <Spoiler>{transformEntities(entity, ctx)}</Spoiler>
    }
    case "codeblock": {
      const lang = entity.params.lang;
      const value = sliceText(ctx, entity.innerSpan);
      return <CodeBlock value={value} lang={lang} />;
    }
    case "blockquote": {
      return <blockquote>{transformEntities(entity, ctx)}</blockquote>;
    }
    case "color": {
      const { color } = entity.params;
      const lastCount = ctx.textCount;
      let el: JSXElement;

      if (color.startsWith("#")) {
        el = <span style={{color}}>{transformEntities(entity, ctx)}</span>
      } else {
        el = transformEntities(entity, ctx);
      }
      
      if (lastCount !== ctx.textCount) {
        return el;
      } else {
        return sliceText(ctx, entity.outerSpan);
      }
    }

    case 'bold':
    case 'italic':
    case 'underline':
    case 'strikethrough': {
      // todo: style folding when there's no before/after for dom memory usage optimization
      // if(beforeSpan.start === beforeSpan.end && afterSpan.start === afterSpan.end) {}
      return <span class={entity.type}>{transformEntities(entity, ctx)}</span>;
    }
    case 'emoji_name': {
      const name = sliceText(ctx, entity.innerSpan, { countText: false });
      const unicode = emojiShortcodeToUnicode(name as unknown as string);
      if (!unicode) return sliceText(ctx, entity.outerSpan);
      return <Emoji name={name} url={unicodeToTwemojiUrl(unicode)} />;
    }
    case 'emoji': {
      const emoji = sliceText(ctx, entity.innerSpan, { countText: false });
      return <Emoji name={emojiUnicodeToShortcode(emoji)} url={unicodeToTwemojiUrl(emoji)} />;
    }
    case 'custom': {
      return transformCustomEntity(entity, ctx);
    }
    default: {
      throw new UnreachableCaseError(entity);
    }
  }
}

export function Markup(props: Props) {
  const ctx = { props: () => props, emojiCount: 0, textCount: 0 };
  const entity = () => addTextSpans(parseMarkup(ctx.props().text));
  const output = () => transformEntity(entity(), ctx);

  return <span class="markup">{output}</span>;
}
