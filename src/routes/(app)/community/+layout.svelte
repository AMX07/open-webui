<script lang="ts">
        import { goto } from '$app/navigation';
        import { getContext, onMount } from 'svelte';

        import { WEBUI_NAME, config, user } from '$lib/stores';

        const i18n = getContext('i18n');

        let loaded = false;

        onMount(() => {
                const unsubscribe = user.subscribe(($user) => {
                        if ($user === undefined) {
                                return;
                        }

                        const hasAccess =
                                ($config?.features?.enable_community_sharing ?? false) &&
                                ($user?.role === 'admin' || $user?.role === 'user');

                        if (!hasAccess) {
                                goto('/');
                                return;
                        }

                        loaded = true;
                });

                return () => {
                        unsubscribe();
                };
        });
</script>

<svelte:head>
        <title>
                {$i18n.t('Community')} • {$WEBUI_NAME}
        </title>
</svelte:head>

{#if loaded}
        <slot />
{/if}
