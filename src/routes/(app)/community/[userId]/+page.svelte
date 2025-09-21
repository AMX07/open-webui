<script lang="ts">
        import { goto } from '$app/navigation';
        import { page } from '$app/stores';
        import { getContext, onMount } from 'svelte';

        import dayjs from 'dayjs';
        import relativeTime from 'dayjs/plugin/relativeTime';
        import { toast } from 'svelte-sonner';

        dayjs.extend(relativeTime);

        import {
                getCommunityUserPage,
                getCommunityPostComments,
                createCommunityComment,
                deleteCommunityComment,
                likeCommunityPost,
                unlikeCommunityPost,
                followCommunityUser,
                unfollowCommunityUser,
                type CommunityPost,
                type CommunityComment,
                type CommunityUserProfile
        } from '$lib/apis/community';

        import { mobile, showSidebar, showArchivedChats, user } from '$lib/stores';

        import Sidebar from '$lib/components/icons/Sidebar.svelte';
        import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
        import Tooltip from '$lib/components/common/Tooltip.svelte';
        import Heart from '$lib/components/icons/Heart.svelte';
        import ChatBubble from '$lib/components/icons/ChatBubble.svelte';
        import Spinner from '$lib/components/common/Spinner.svelte';

        const i18n = getContext('i18n');

        const PAGE_SIZE = 20;

        type CommentState = {
                comments: CommunityComment[];
                visible: boolean;
                loading: boolean;
                input: string;
                submitting: boolean;
        };

        let loading = false;
        let posts: CommunityPost[] = [];
        let totalPosts = 0;
        let profile: CommunityUserProfile | null = null;
        let page = 1;

        let commentState: Record<string, CommentState> = {};

        const resetCommentState = (postId: string) => {
                commentState = {
                        ...commentState,
                        [postId]: {
                                comments: [],
                                visible: false,
                                loading: false,
                                input: '',
                                submitting: false
                        }
                };
        };

        const ensureToken = () => {
                if (typeof localStorage === 'undefined') {
                        return null;
                }
                return localStorage.getItem('token');
        };

        const loadUserPage = async (pageNumber: number = 1) => {
                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                const userId = $page.params.userId;
                if (!userId) {
                        return;
                }

                loading = true;
                try {
                        const response = await getCommunityUserPage(token, userId, {
                                page: pageNumber,
                                limit: PAGE_SIZE
                        });

                        profile = response.profile;
                        totalPosts = response.posts.total;

                        if (pageNumber === 1) {
                                posts = response.posts.posts;
                                commentState = {};
                                for (const post of posts) {
                                        resetCommentState(post.id);
                                }
                                page = 1;
                        } else {
                                posts = [...posts, ...response.posts.posts];
                                for (const post of response.posts.posts) {
                                        if (!commentState[post.id]) {
                                                resetCommentState(post.id);
                                        }
                                }
                                page = pageNumber;
                        }
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to load user profile.')
                        );
                } finally {
                        loading = false;
                }
        };

        onMount(async () => {
                await loadUserPage(1);
        });

        const toggleComments = async (postId: string) => {
                const state = commentState[postId];
                if (!state) {
                        return;
                }

                if (!state.visible && state.comments.length === 0) {
                        state.loading = true;
                        commentState = { ...commentState };

                        try {
                                const token = ensureToken();
                                if (!token) {
                                        toast.error($i18n.t('You need to sign in to use the community.'));
                                        return;
                                }

                                const comments = await getCommunityPostComments(token, postId);
                                state.comments = comments;
                        } catch (error) {
                                console.error(error);
                                toast.error(
                                        typeof error === 'string'
                                                ? error
                                                : $i18n.t('Failed to load comments.')
                                );
                        } finally {
                                state.loading = false;
                                commentState = { ...commentState };
                        }
                }

                state.visible = !state.visible;
                commentState = { ...commentState };
        };

        const submitComment = async (postId: string) => {
                const state = commentState[postId];
                if (!state || !state.input.trim()) {
                        return;
                }

                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                state.submitting = true;
                commentState = { ...commentState };

                try {
                        const comment = await createCommunityComment(token, postId, state.input);
                        state.comments = [...state.comments, comment];
                        state.input = '';

                        posts = posts.map((post) =>
                                post.id === postId
                                        ? {
                                                  ...post,
                                                  comment_count: post.comment_count + 1
                                          }
                                        : post
                        );
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to add comment.')
                        );
                } finally {
                        state.submitting = false;
                        commentState = { ...commentState };
                }
        };

        const removeComment = async (postId: string, commentId: string) => {
                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                const state = commentState[postId];
                if (!state) {
                        return;
                }

                try {
                        await deleteCommunityComment(token, postId, commentId);
                        state.comments = state.comments.filter((comment) => comment.id !== commentId);
                        posts = posts.map((post) =>
                                post.id === postId
                                        ? {
                                                  ...post,
                                                  comment_count: Math.max(post.comment_count - 1, 0)
                                          }
                                        : post
                        );
                        commentState = { ...commentState };
                        toast.success($i18n.t('Comment deleted.'));
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to delete comment.')
                        );
                }
        };

        const toggleLike = async (post: CommunityPost) => {
                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                try {
                        const response = post.viewer_has_liked
                                ? await unlikeCommunityPost(token, post.id)
                                : await likeCommunityPost(token, post.id);

                        posts = posts.map((item) =>
                                item.id === post.id
                                        ? {
                                                  ...item,
                                                  viewer_has_liked: response.liked,
                                                  like_count: response.like_count
                                          }
                                        : item
                        );
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to update like.')
                        );
                }
        };

        const toggleFollow = async () => {
                if (!profile) {
                        return;
                }

                if (profile.user.id === $user?.id) {
                        return;
                }

                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                const isFollowing = profile.viewer_is_following;

                try {
                        const response = isFollowing
                                ? await unfollowCommunityUser(token, profile.user.id)
                                : await followCommunityUser(token, profile.user.id);

                        profile = {
                                ...profile,
                                viewer_is_following: response.following,
                                follower_count: response.follower_count
                        };

                        posts = posts.map((post) => ({
                                ...post,
                                viewer_is_following_author: response.following
                        }));

                        toast.success(
                                response.following
                                        ? $i18n.t('Following {{name}}', { name: profile.user.name })
                                        : $i18n.t('Unfollowed {{name}}', { name: profile.user.name })
                        );
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string'
                                        ? error
                                        : $i18n.t('Failed to update follow status.')
                        );
                }
        };

        const loadMore = async () => {
                if (loading) {
                        return;
                }

                const nextPage = page + 1;
                await loadUserPage(nextPage);
        };

        const goBack = () => {
                goto('/community');
        };
</script>

<div
        class=" flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
                ? 'md:max-w-[calc(100%-260px)]'
                : ''} max-w-full"
>
        <nav class=" px-2 pt-1.5 backdrop-blur-xl w-full drag-region">
                <div class=" flex items-center">
                        {#if $mobile}
                                <div class="{$showSidebar ? 'md:hidden' : ''} flex flex-none items-center">
                                        <Tooltip
                                                content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
                                                interactive={true}
                                        >
                                                <button
                                                        id="sidebar-toggle-button"
                                                        class=" cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
                                                        on:click={() => {
                                                                showSidebar.set(!$showSidebar);
                                                        }}
                                                >
                                                        <div class=" self-center p-1.5">
                                                                <Sidebar />
                                                        </div>
                                                </button>
                                        </Tooltip>
                                </div>
                        {/if}

                        <div class="ml-2 py-0.5 self-center flex items-center justify-between w-full">
                                <div class=" flex items-center gap-2">
                                        <button
                                                class=" text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                                on:click={goBack}
                                        >
                                                {$i18n.t('Back to Community')}
                                        </button>
                                        {#if profile}
                                                <span class=" text-sm text-gray-400">/</span>
                                                <span class=" text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {profile.user.name}
                                                </span>
                                        {/if}
                                </div>

                                <div class=" self-center flex items-center gap-1">
                                        {#if $user !== undefined && $user !== null}
                                                <UserMenu
                                                        className="max-w-[240px]"
                                                        role={$user?.role}
                                                        help={true}
                                                        on:show={(e) => {
                                                                if (e.detail === 'archived-chat') {
                                                                        showArchivedChats.set(true);
                                                                }
                                                        }}
                                                >
                                                        <button
                                                                class="select-none flex rounded-xl p-1.5 w-full hover:bg-gray-50 dark:hover:bg-gray-850 transition"
                                                                aria-label="User Menu"
                                                        >
                                                                <div class=" self-center">
                                                                        <img
                                                                                src={$user?.profile_image_url}
                                                                                class="size-6 object-cover rounded-full"
                                                                                alt="User profile"
                                                                                draggable="false"
                                                                        />
                                                                </div>
                                                        </button>
                                                </UserMenu>
                                        {/if}
                                </div>
                        </div>
                </div>
        </nav>

        <div class=" pb-1 flex-1 max-h-full overflow-y-auto">
                <div class=" max-w-3xl mx-auto px-4 pb-10 pt-4 flex flex-col gap-4">
                        {#if profile}
                                <section class=" bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                                        <div class=" flex items-start gap-4">
                                                <img
                                                        src={profile.user.profile_image_url ?? '/user.png'}
                                                        alt={profile.user.name}
                                                        class=" size-16 rounded-full object-cover"
                                                />
                                                <div class=" flex-1">
                                                        <h1 class=" text-xl font-semibold text-gray-900 dark:text-gray-100">
                                                                {profile.user.name}
                                                        </h1>
                                                        <div class=" text-sm text-gray-500 dark:text-gray-400">
                                                                {profile.user.email}
                                                        </div>
                                                        <div class=" flex gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                                                                <span>
                                                                        <strong>{profile.follower_count}</strong>
                                                                        <span class=" ml-1">{$i18n.t('Followers')}</span>
                                                                </span>
                                                                <span>
                                                                        <strong>{profile.following_count}</strong>
                                                                        <span class=" ml-1">{$i18n.t('Following')}</span>
                                                                </span>
                                                        </div>
                                                </div>

                                                {#if profile.user.id !== $user?.id}
                                                        <button
                                                                class=" rounded-xl px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                                on:click={toggleFollow}
                                                        >
                                                                {profile.viewer_is_following
                                                                        ? $i18n.t('Following')
                                                                        : $i18n.t('Follow')}
                                                        </button>
                                                {/if}
                                        </div>
                                </section>
                        {/if}

                        {#if loading && posts.length === 0}
                                <div class=" flex justify-center py-10">
                                        <Spinner className="size-6" />
                                </div>
                        {:else if posts.length === 0}
                                <div class=" text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                                        {$i18n.t('No posts from this user yet.')}
                                </div>
                        {/if}

                        {#each posts as post (post.id)}
                                <article class=" bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 space-y-4">
                                        <header class=" flex justify-between items-start gap-2">
                                                <div class=" flex gap-3">
                                                        <img
                                                                src={post.author?.profile_image_url ?? '/user.png'}
                                                                alt={post.author?.name ?? 'User avatar'}
                                                                class=" size-10 rounded-full object-cover"
                                                        />
                                                        <div>
                                                                <div class=" font-semibold text-gray-900 dark:text-gray-50">
                                                                        {post.author?.name ?? $i18n.t('Unknown User')}
                                                                </div>
                                                                <div class=" text-xs text-gray-500 dark:text-gray-400">
                                                                        {dayjs(post.created_at / 1000000).fromNow()}
                                                                </div>
                                                        </div>
                                                </div>
                                        </header>

                                        {#if post.title}
                                                <h3 class=" text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                        {post.title}
                                                </h3>
                                        {/if}

                                        <div class=" text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-line">
                                                {post.content}
                                        </div>

                                        <footer class=" flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                                <button
                                                        class=" flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                        on:click={() => toggleLike(post)}
                                                >
                                                        <Heart className={`size-4 ${
                                                                post.viewer_has_liked ? 'text-red-500' : 'text-gray-500'
                                                        }`} />
                                                        <span>{post.like_count}</span>
                                                </button>

                                                <button
                                                        class=" flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                        on:click={() => toggleComments(post.id)}
                                                >
                                                        <ChatBubble className="size-4 text-gray-500" />
                                                        <span>{post.comment_count}</span>
                                                        <span class=" text-xs text-gray-400">
                                                                {commentState[post.id]?.visible
                                                                        ? $i18n.t('Hide')
                                                                        : $i18n.t('Show')}
                                                        </span>
                                                </button>
                                        </footer>

                                        {#if commentState[post.id]?.visible}
                                                <div class=" border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                                                        {#if commentState[post.id]?.loading}
                                                                <div class=" flex justify-center py-4">
                                                                        <Spinner className="size-4" />
                                                                </div>
                                                        {:else}
                                                                {#each commentState[post.id]?.comments ?? [] as comment (comment.id)}
                                                                        <div class=" flex gap-3">
                                                                                <img
                                                                                        src={comment.author?.profile_image_url ?? '/user.png'}
                                                                                        alt={comment.author?.name ?? 'User avatar'}
                                                                                        class=" size-8 rounded-full object-cover"
                                                                                />
                                                                                <div class=" flex-1">
                                                                                        <div class=" flex items-center gap-2">
                                                                                                <span class=" text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                                                        {comment.author?.name ?? $i18n.t('Unknown User')}
                                                                                                </span>
                                                                                                <span class=" text-xs text-gray-500 dark:text-gray-400">
                                                                                                        {dayjs(comment.created_at / 1000000).fromNow()}
                                                                                                </span>
                                                                                                {#if comment.user_id === $user?.id}
                                                                                                        <button
                                                                                                                class=" text-xs text-red-500 hover:text-red-600"
                                                                                                                on:click={() => removeComment(post.id, comment.id)}
                                                                                                        >
                                                                                                                {$i18n.t('Delete')}
                                                                                                        </button>
                                                                                                {/if}
                                                                                        </div>
                                                                                        <div class=" text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                                                                                                {comment.content}
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                {/each}
                                                        {/if}

                                                        <div class=" flex gap-2">
                                                                <input
                                                                        class=" flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        type="text"
                                                                        placeholder={$i18n.t('Add a comment...')}
                                                                        bind:value={commentState[post.id]!.input}
                                                                        on:keydown={(event) => {
                                                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                                                        event.preventDefault();
                                                                                        submitComment(post.id);
                                                                                }
                                                                        }}
                                                                />
                                                                <button
                                                                        class=" px-3 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm hover:opacity-90 transition disabled:opacity-60"
                                                                        on:click={() => submitComment(post.id)}
                                                                        disabled={commentState[post.id]!.submitting}
                                                                >
                                                                        {commentState[post.id]!.submitting
                                                                                ? $i18n.t('Sending...')
                                                                                : $i18n.t('Send')}
                                                                </button>
                                                        </div>
                                                </div>
                                        {/if}
                                </article>
                        {/each}

                        {#if posts.length < totalPosts}
                                <div class=" flex justify-center">
                                        <button
                                                class=" px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                on:click={loadMore}
                                                disabled={loading}
                                        >
                                                {loading ? $i18n.t('Loading...') : $i18n.t('Load more')}
                                        </button>
                                </div>
                        {/if}
                </div>
        </div>
</div>
