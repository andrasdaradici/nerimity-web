import ServerDrawerHeader from '@/components/servers/drawer/header/ServerDrawerHeader';
import Icon from '@/components/ui/icon/Icon';
import { Link, useMatch, useParams } from '@nerimity/solid-router';
import { For, Show } from 'solid-js';
import useStore from '@/chat-api/store/useStore';
import RouterEndpoints from '@/common/RouterEndpoints';
import serverSettings from '@/common/ServerSettings';
import ItemContainer from '@/components/ui/Item';
import { styled } from 'solid-styled-components';
import Text from '@/components/ui/Text';
import { useTransContext } from '@nerimity/solid-i18next';
import { Bitwise } from '@/chat-api/Bitwise';

const SettingsListContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
  height: 100%;
  padding-bottom: 3px;
`;

const SettingItemContainer = styled(ItemContainer)<{nested?: boolean}>`
  height: 32px;
  gap: 5px;
  padding-left: ${props => props.nested ? '25px' : '10px'};
  margin-left: 3px;
  margin-right: 3px;

  .label {
    opacity: ${props => props.selected ? 1 : 0.6};
    transition: 0.2s;
  }

  &:hover .label {
    opacity: 1;
  }
`;


export default function ServerSettingsDrawer() {
  return (
    <SettingsList />
  )
}

function SettingsList () {
  const [t] = useTransContext();
  const params = useParams();
  const {serverMembers, account, servers} = useStore();
  const member = () => serverMembers.get(params.serverId, account.user()?.id!);
  const server = () => servers.get(params.serverId);

  const hasPermission = (role?: Bitwise) => {
    if (!role) return true;
    if (server()?.createdById === account.user()?.id) return true;
    return member()?.hasPermission(role)
  };

  return (
    <SettingsListContainer>
      <ServerDrawerHeader />
      <For each={serverSettings}>
        {(setting) => {
          if (setting.hideDrawer) return null;
          const selected = () => params.path === setting.path;
          const isChannels = () => setting.path === "channels";
          return (
            <Show when={hasPermission(setting.requiredRolePermission)}>
              <Item path={setting.path || "#  "} icon={setting.icon} label={t(setting.name)} selected={selected()} />
              <Show when={isChannels() && selected()}><ServerChannelsList/></Show>
            </Show>
          )
        }}
      </For>
    </SettingsListContainer>
  )
}


function Item (props: {path: string,icon: string, label: string, selected?: boolean, nested?: boolean, onClick?: () => void}) {
  const params = useParams();

  const href = () => {
    if (props.nested) return props.path;
    return "/app/servers/" + params.serverId + "/settings/" + props.path;
  };

  const selected = useMatch(href)

  return (
    <Link 
      href={href()}
      style={{"text-decoration": "none"}}
      >
        <SettingItemContainer nested={props.nested} selected={selected()}>
          <Icon name={props.icon} size={18} />
          <Text class="label">{props.label}</Text>
        </SettingItemContainer>
    </Link>
  )
}

function ServerChannelsList () {
  const params = useParams();
  const {channels} = useStore();
  const serverChannels = () =>channels.getChannelsByServerId(params.serverId);

  return (
    <For each={serverChannels()}>
      {(channel) => {
        const path = RouterEndpoints.SERVER_SETTINGS_CHANNEL(params.serverId, channel!.id);
        const selected = () =>params.id === channel!.id;
        return <Item nested={true} icon='storage' label={channel!.name} path={path} selected={selected()} />
      }}
    </For>
  )
}