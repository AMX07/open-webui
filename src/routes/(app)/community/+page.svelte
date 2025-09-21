<script lang="ts">
        import { goto } from '$app/navigation';
        import { getContext, onMount } from 'svelte';

        import dayjs from 'dayjs';
        import relativeTime from 'dayjs/plugin/relativeTime';
        import { toast } from 'svelte-sonner';

        dayjs.extend(relativeTime);

        import {
                getCommunityFeed,
                createCommunityPost,
                getCommunityPostComments,
                createCommunityComment,
                deleteCommunityComment,
                likeCommunityPost,
                unlikeCommunityPost,
                followCommunityUser,
                unfollowCommunityUser,
                type CommunityPost,
                type CommunityComment
        } from '$lib/apis/community';

        import { mobile, showSidebar, showArchivedChats, user } from '$lib/stores';

        import Sidebar from '$lib/components/icons/Sidebar.svelte';
        import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
        import Tooltip from '$lib/components/common/Tooltip.svelte';
        import Heart from '$lib/components/icons/Heart.svelte';
        import ChatBubble from '$lib/components/icons/ChatBubble.svelte';
        import UserPlusSolid from '$lib/components/icons/UserPlusSolid.svelte';
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
        let page = 1;

        let newPostTitle = '';
        let newPostContent = '';
        let creatingPost = false;

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

        const loadFeed = async () => {
                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                page = 1;
                loading = true;
                try {
                        const feed = await getCommunityFeed(token, { page, limit: PAGE_SIZE });
                        posts = feed.posts;
                        totalPosts = feed.total;

                        const nextState: Record<string, CommentState> = {};
                        for (const post of posts) {
                                nextState[post.id] = commentState[post.id] ?? {
                                        comments: [],
                                        visible: false,
                                        loading: false,
                                        input: '',
                                        submitting: false
                                };
                        }
                        commentState = nextState;
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to load community posts.')
                        );
                } finally {
                        loading = false;
                }
        };

        onMount(async () => {
                await loadFeed();
        });

        const submitPost = async () => {
                if (!newPostContent.trim()) {
                        toast.error($i18n.t('Share something with the community before posting.'));
                        return;
                }

                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                creatingPost = true;
                try {
                        const post = await createCommunityPost(token, {
                                title: newPostTitle ? newPostTitle : null,
                                content: newPostContent
                        });

                        posts = [post, ...posts];
                        totalPosts += 1;
                        resetCommentState(post.id);

                        newPostTitle = '';
                        newPostContent = '';

                        toast.success($i18n.t('Post created successfully.'));
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to create post.')
                        );
                } finally {
                        creatingPost = false;
                }
        };

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
                        state.loading = false;
                        commentState = { ...commentState };
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

        const toggleFollow = async (post: CommunityPost) => {
                if (!post.author || post.user_id === $user?.id) {
                        return;
                }

                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                const isFollowing = post.viewer_is_following_author;

                try {
                        if (isFollowing) {
                                await unfollowCommunityUser(token, post.user_id);
                        } else {
                                await followCommunityUser(token, post.user_id);
                        }

                        posts = posts.map((item) =>
                                item.id === post.id
                                        ? { ...item, viewer_is_following_author: !item.viewer_is_following_author }
                                        : item
                        );
                        toast.success(
                                isFollowing
                                        ? $i18n.t('Unfollowed {{name}}', { name: post.author.name })
                                        : $i18n.t('Following {{name}}', { name: post.author.name })
                        );
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to update follow status.')
                        );
                }
        };

        const openUserPage = (post: CommunityPost) => {
                goto(`/community/${post.user_id}`);
        };

        const loadMore = async () => {
                if (loading) {
                        return;
                }

                const nextPage = page + 1;
                const token = ensureToken();
                if (!token) {
                        toast.error($i18n.t('You need to sign in to use the community.'));
                        return;
                }

                loading = true;
                try {
                        const feed = await getCommunityFeed(token, { page: nextPage, limit: PAGE_SIZE });
                        posts = [...posts, ...feed.posts];
                        totalPosts = feed.total;
                        page = nextPage;

                        for (const post of feed.posts) {
                                if (!commentState[post.id]) {
                                        resetCommentState(post.id);
                                }
                        }
                } catch (error) {
                        console.error(error);
                        toast.error(
                                typeof error === 'string' ? error : $i18n.t('Failed to load community posts.')
                        );
                } finally {
                        loading = false;
                }
        };
</script>

<div
        class={`flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out ${
                $showSidebar ? 'md:max-w-[calc(100%-260px)]' : ''
        } max-w-full`}
>
        <nav class=" px-2 pt-1.5 backdrop-blur-xl w-full drag-region">
                <div class=" flex items-center">
                        {#if $mobile}
                                <div
                                        class={`flex flex-none items-center ${$showSidebar ? 'md:hidden' : ''}`}
                                >
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
                                <div class="">
                                        <div class="flex gap-1 text-center text-sm font-medium bg-transparent py-1">
                                                <a class="min-w-fit transition" href="/community">
                                                        {$i18n.t('Community')}
                                                </a>
                                        </div>
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
                        <section class=" bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 space-y-3">
                                <h2 class=" text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {$i18n.t('Share with the community')}
                                </h2>
                                <input
                                        class=" w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        type="text"
                                        placeholder={$i18n.t('Title (optional)')}
                                        bind:value={newPostTitle}
                                        maxlength={120}
                                />
                                <textarea
                                        class=" w-full min-h-32 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={$i18n.t('Tell everyone about your latest prompt, workflow, or idea...')}
                                        bind:value={newPostContent}
                                />
                                <div class=" flex justify-end">
                                        <button
                                                class=" flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 transition disabled:opacity-60"
                                                on:click={submitPost}
                                                disabled={creatingPost}
                                        >
                                                {#if creatingPost}
                                                        <Spinner className="size-4" />
                                                {/if}
                                                <span>{$i18n.t('Post')}</span>
                                        </button>
                                </div>
                        </section>

                        {#if loading && posts.length === 0}
                                <div class=" flex justify-center py-10">
                                        <Spinner className="size-6" />
                                </div>
                        {:else if posts.length === 0}
                                <div class=" text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                                        {$i18n.t('No community posts yet. Be the first to share!')}
                                </div>
                        {/if}

                        {#each posts as post (post.id)}
                                <article class=" bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 space-y-4">
                                        <header class=" flex justify-between items-start gap-2">
                                                <div class=" flex gap-3 cursor-pointer" on:click={() => openUserPage(post)}>
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

                                                {#if post.author && post.user_id !== $user?.id}
                                                        <button
                                                                class=" flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                                on:click={() => toggleFollow(post)}
                                                        >
                                                                <UserPlusSolid className={`size-4 ${
                                                                        post.viewer_is_following_author
                                                                                ? 'text-blue-600'
                                                                                : 'text-gray-500 dark:text-gray-400'
                                                                }`} />
                                                                <span>
                                                                        {post.viewer_is_following_author
                                                                                ? $i18n.t('Following')
                                                                                : $i18n.t('Follow')}
                                                                </span>
                                                        </button>
                                                {/if}
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
                                                                post.viewer_has_liked
                                                                        ? 'text-red-500'
                                                                        : 'text-gray-500'
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
