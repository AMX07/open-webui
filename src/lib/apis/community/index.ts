import { WEBUI_API_BASE_URL } from '$lib/constants';

export type CommunityUser = {
        id: string;
        name: string;
        email: string;
        role: string;
        profile_image_url: string;
};

export type CommunityPost = {
        id: string;
        user_id: string;
        title?: string | null;
        content: string;
        attachments?: unknown;
        meta?: unknown;
        created_at: number;
        updated_at: number;
        like_count: number;
        comment_count: number;
        viewer_has_liked: boolean;
        viewer_is_following_author: boolean;
        author?: CommunityUser | null;
};

export type CommunityComment = {
        id: string;
        post_id: string;
        user_id: string;
        content: string;
        created_at: number;
        updated_at: number;
        author?: CommunityUser | null;
};

export type CommunityPostList = {
        posts: CommunityPost[];
        total: number;
};

export type CommunityPostDetail = {
        post: CommunityPost;
        comments: CommunityComment[];
};

export type CommunityUserProfile = {
        user: CommunityUser;
        follower_count: number;
        following_count: number;
        viewer_is_following: boolean;
};

export type CommunityUserPage = {
        profile: CommunityUserProfile;
        posts: CommunityPostList;
};

type PaginationParams = {
        page?: number;
        limit?: number;
};

type FeedParams = PaginationParams & {
        userId?: string;
};

const handleResponse = async <T>(res: Response): Promise<T> => {
        if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: 'Request failed' }));
                throw error.detail ?? error;
        }

        return (await res.json()) as T;
};

const authHeaders = (token: string) => ({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`
});

export const getCommunityFeed = async (
        token: string,
        params: FeedParams = {}
): Promise<CommunityPostList> => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.set('page', `${params.page}`);
        if (params.limit) searchParams.set('limit', `${params.limit}`);
        if (params.userId) searchParams.set('user_id', params.userId);

        const res = await fetch(
                `${WEBUI_API_BASE_URL}/community/posts?${searchParams.toString()}`,
                {
                        method: 'GET',
                        headers: authHeaders(token)
                }
        );

        return handleResponse<CommunityPostList>(res);
};

type CreatePostPayload = {
        title?: string | null;
        content: string;
        attachments?: unknown;
        meta?: unknown;
};

export const createCommunityPost = async (
        token: string,
        payload: CreatePostPayload
): Promise<CommunityPost> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify(payload)
        });

        return handleResponse<CommunityPost>(res);
};

type UpdatePostPayload = Partial<CreatePostPayload>;

export const updateCommunityPost = async (
        token: string,
        postId: string,
        payload: UpdatePostPayload
): Promise<CommunityPost> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/update`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify(payload)
        });

        return handleResponse<CommunityPost>(res);
};

export const deleteCommunityPost = async (
        token: string,
        postId: string
): Promise<boolean> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/delete`, {
                method: 'POST',
                headers: authHeaders(token)
        });

        const data = await handleResponse<{ status: boolean }>(res);
        return data.status;
};

export const getCommunityPost = async (
        token: string,
        postId: string
): Promise<CommunityPostDetail> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}`, {
                method: 'GET',
                headers: authHeaders(token)
        });

        return handleResponse<CommunityPostDetail>(res);
};

export const getCommunityPostComments = async (
        token: string,
        postId: string
): Promise<CommunityComment[]> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/comments`, {
                method: 'GET',
                headers: authHeaders(token)
        });

        return handleResponse<CommunityComment[]>(res);
};

export const createCommunityComment = async (
        token: string,
        postId: string,
        content: string
): Promise<CommunityComment> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/comments`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ content })
        });

        return handleResponse<CommunityComment>(res);
};

export const deleteCommunityComment = async (
        token: string,
        postId: string,
        commentId: string
): Promise<boolean> => {
        const res = await fetch(
                `${WEBUI_API_BASE_URL}/community/posts/${postId}/comments/${commentId}`,
                {
                        method: 'DELETE',
                        headers: authHeaders(token)
                }
        );

        const data = await handleResponse<{ status: boolean }>(res);
        return data.status;
};

export const likeCommunityPost = async (
        token: string,
        postId: string
): Promise<{ liked: boolean; like_count: number }> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/like`, {
                method: 'POST',
                headers: authHeaders(token)
        });

        return handleResponse<{ liked: boolean; like_count: number }>(res);
};

export const unlikeCommunityPost = async (
        token: string,
        postId: string
): Promise<{ liked: boolean; like_count: number }> => {
        const res = await fetch(`${WEBUI_API_BASE_URL}/community/posts/${postId}/like`, {
                method: 'DELETE',
                headers: authHeaders(token)
        });

        return handleResponse<{ liked: boolean; like_count: number }>(res);
};

export const followCommunityUser = async (
        token: string,
        targetUserId: string
): Promise<{ following: boolean; follower_count: number }> => {
        const res = await fetch(
                `${WEBUI_API_BASE_URL}/community/users/${targetUserId}/follow`,
                {
                        method: 'POST',
                        headers: authHeaders(token)
                }
        );

        return handleResponse<{ following: boolean; follower_count: number }>(res);
};

export const unfollowCommunityUser = async (
        token: string,
        targetUserId: string
): Promise<{ following: boolean; follower_count: number }> => {
        const res = await fetch(
                `${WEBUI_API_BASE_URL}/community/users/${targetUserId}/follow`,
                {
                        method: 'DELETE',
                        headers: authHeaders(token)
                }
        );

        return handleResponse<{ following: boolean; follower_count: number }>(res);
};

export const getCommunityUserPage = async (
        token: string,
        targetUserId: string,
        params: PaginationParams = {}
): Promise<CommunityUserPage> => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.set('page', `${params.page}`);
        if (params.limit) searchParams.set('limit', `${params.limit}`);

        const res = await fetch(
                `${WEBUI_API_BASE_URL}/community/users/${targetUserId}?${searchParams.toString()}`,
                {
                        method: 'GET',
                        headers: authHeaders(token)
                }
        );

        return handleResponse<CommunityUserPage>(res);
};
