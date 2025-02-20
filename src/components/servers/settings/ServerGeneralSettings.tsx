import { useParams } from '@nerimity/solid-router';
import { createEffect, createSignal, onCleanup, Setter, Show } from 'solid-js';
import useStore from '@/chat-api/store/useStore';
import { useWindowProperties } from '@/common/useWindowProperties';
import Input from '@/components/ui/input/Input';
import DropDown from '@/components/ui/drop-down/DropDown';
import Button from '@/components/ui/Button';
import { createUpdatedSignal } from '@/common/createUpdatedSignal';
import { deleteServer, updateServer } from '@/chat-api/services/ServerService';
import SettingsBlock from '@/components/ui/settings-block/SettingsBlock';
import { Server } from '@/chat-api/store/useServers';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal/DeleteConfirmModal';
import { useCustomPortal } from '@/components/ui/custom-portal/CustomPortal';
import Text from '@/components/ui/Text';
import { css, styled } from 'solid-styled-components';
import { Notice } from '@/components/ui/Notice';
import { useTransContext } from '@nerimity/solid-i18next';
import FileBrowser, { FileBrowserRef } from '@/components/ui/FileBrowser';
import { reconcile } from 'solid-js/store';

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  padding: 10px;
`;

export default function ServerGeneralSettings(props: {updateHeader: Setter<{name?: string, avatar?: any, banner?: string}>}) {
  const [t] = useTransContext();
  const params = useParams<{serverId: string}>();
  const {header, servers, channels} = useStore();
  const [requestSent, setRequestSent] = createSignal(false);
  const [error, setError] = createSignal<null | string>(null);
  const {createPortal} = useCustomPortal();
  const [avatarFileBrowserRef, setAvatarFileBrowserRef] = createSignal<undefined | FileBrowserRef>()
  const [bannerFileBrowserRef, setBannerFileBrowserRef] = createSignal<undefined | FileBrowserRef>()

  const server = () => servers.get(params.serverId);

  const defaultInput = () => ({
    name: server()?.name || '',
    defaultChannelId: server()?.defaultChannelId || '',
    systemChannelId: server()?.systemChannelId || null,
    avatar: '',
    banner: '',
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);

  const dropDownChannels = () => channels.getChannelsByServerId(params.serverId).map(channel => ({
    id: channel!.id,
    label: channel!.name,
    onClick: () => {
      setInputValue('defaultChannelId', channel!.id);
    }
  }));

  const dropDownSystemChannels = () => {
    const list = channels.getChannelsByServerId(params.serverId).map(channel => ({
      id: channel!.id,
      label: channel!.name,
      onClick: () => {
        setInputValue('systemChannelId', channel!.id);
      }
    }));

    return [{
      id: null,
      label: "None",
      onClick: () => {
        setInputValue("systemChannelId", null);
      }
    }, ...list]
  };

  createEffect(() => {
    header.updateHeader({
      title: "Settings - General",
      serverId: params.serverId!,
      iconName: 'settings',
    });
  })
  onCleanup(() => {
    props.updateHeader(reconcile({}));
  })

  const onSaveButtonClicked = async () => {
    if (requestSent()) return;
    setRequestSent(true);
    setError(null);
    const values = updatedInputValues();
    await updateServer(params.serverId!, values)
      .then(() => {
        setInputValue("avatar", '')
        setInputValue("banner", '')
        props.updateHeader(reconcile({}));
      })
      .catch((err) => setError(err.message))
      .finally(() => setRequestSent(false));
  }

  const requestStatus = () => requestSent() ? t('servers.settings.general.saving') : t('servers.settings.general.saveChangesButton');

  const showDeleteConfirm = () => {
    createPortal?.(close => <ServerDeleteConfirmModal close={close} server={server()!} />)
  }


  const onAvatarPick = (files: string[]) => {
    if (files[0]) {
      setInputValue("avatar", files[0])
      props.updateHeader({avatar: files[0]})
    }
  }

  const onBannerPick = (files: string[]) => {
    if (files[0]) {
      setInputValue("banner", files[0])
      props.updateHeader({banner: files[0]})
    }
  }

  return (
    <Container>

      <Show when={server()?.verified}>
        <Notice class={css`margin-bottom: 10px;`} type='warn' description={t('servers.settings.general.serverRenameNotice')}/>

      </Show>
      
      <SettingsBlock icon='edit' label={t('servers.settings.general.serverName')}>
        <Input value={inputValues().name} onText={(v) => setInputValue('name', v) } />
      </SettingsBlock>
      <SettingsBlock icon='tag' label={t('servers.settings.general.defaultChannel')} description={t('servers.settings.general.defaultChannelDescription')}>
        <DropDown items={dropDownChannels()} selectedId={inputValues().defaultChannelId} />
      </SettingsBlock>
        
      <SettingsBlock icon="wysiwyg" label={t('servers.settings.general.systemMessages')} description={t('servers.settings.general.systemMessagesDescription')}>
        <DropDown items={dropDownSystemChannels()} selectedId={inputValues().systemChannelId}  />
      </SettingsBlock>

      <SettingsBlock icon='wallpaper' label='Avatar'>
        <FileBrowser accept='images' ref={setAvatarFileBrowserRef} base64 onChange={onAvatarPick}/>
        <Show when={inputValues().avatar}>
          <Button margin={0} color='var(--alert-color)' iconSize={18} iconName='close'  onClick={() => {setInputValue("avatar", ""); props.updateHeader({avatar: undefined});}} />
        </Show>
        <Button iconSize={18} iconName='attach_file' label='Browse' onClick={avatarFileBrowserRef()?.open} />
      </SettingsBlock>

      <SettingsBlock icon='panorama' label='Banner'>
        <FileBrowser accept='images' ref={setBannerFileBrowserRef} base64 onChange={onBannerPick}/>
        <Show when={inputValues().banner}>
          <Button margin={0} color='var(--alert-color)' iconSize={18} iconName='close'  onClick={() => {setInputValue("banner", ""); props.updateHeader({banner: undefined});}} />
        </Show>
        <Button iconSize={18} iconName='attach_file' label='Browse' onClick={bannerFileBrowserRef()?.open} />
      </SettingsBlock>

      
      <SettingsBlock icon='delete' label={t('servers.settings.general.deleteThisServer')} description={t('servers.settings.general.deleteThisServerDescription')}>
        <Button label={t('servers.settings.general.deleteServerButton')} color='var(--alert-color)' onClick={showDeleteConfirm} />
      </SettingsBlock>

      <Show when={error()}><Text size={12} color="var(--alert-color)" style={{"margin-top": "5px"}}>{error()}</Text></Show>

      <Show when={Object.keys(updatedInputValues()).length}>
        <Button iconName='save' label={requestStatus()} class={css`align-self: flex-end;`} onClick={onSaveButtonClicked} />
      </Show>
    </Container>
  )
}

function ServerDeleteConfirmModal(props: {server: Server, close: () => void;}) {
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!props.server) {
      props.close();
    }
  })
  
  const onDeleteClick = async () => {
    setError(null);

    deleteServer(props.server.id)
      .catch(e => setError(e))
  }

  return (
    <DeleteConfirmModal
      title={`Delete ${props.server?.name}`} 
      close={props.close}
      errorMessage={error()}
      confirmText={props.server?.name}
      onDeleteClick={onDeleteClick}
    />
  )
}
