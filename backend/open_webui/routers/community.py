import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from open_webui.constants import ERROR_MESSAGES
from open_webui.env import SRC_LOG_LEVELS
from open_webui.models.community import (
    Comments,
    CommunityCommentForm,
    CommunityCommentWithUser,
    CommunityPostDetailResponse,
    CommunityPostForm,
    CommunityPostListResponse,
    CommunityPostUpdateForm,
    CommunityPostWithUser,
    CommunityUserPageResponse,
    CommunityUserProfile,
    Followers,
    Likes,
    Posts,
)
from open_webui.models.users import UserResponse, Users
from open_webui.utils.auth import get_verified_user


log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["MODELS"])

router = APIRouter()


class LikeResponse(BaseModel):
    liked: bool
    like_count: int


class FollowResponse(BaseModel):
    following: bool
    follower_count: int


def _get_limit(limit: Optional[int]) -> int:
    if limit is None:
        return 20
    return max(1, min(50, limit))


def _ensure_community_enabled(request: Request):
    if not request.app.state.config.ENABLE_COMMUNITY_SHARING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )


############################
# Posts
############################


@router.get("/community/posts", response_model=CommunityPostListResponse)
async def list_posts(
    request: Request,
    page: Optional[int] = 1,
    limit: Optional[int] = None,
    user_id: Optional[str] = None,
    user=Depends(get_verified_user),
):
    _ensure_community_enabled(request)
    limit = _get_limit(limit)
    page = max(1, page or 1)
    skip = (page - 1) * limit

    posts, total = Posts.get_posts(
        viewer_id=user.id,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )

    return CommunityPostListResponse(posts=posts, total=total)


@router.post("/community/posts", response_model=CommunityPostWithUser)
async def create_post(
    request: Request, form_data: CommunityPostForm, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    if not form_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.VALIDATION_FAILED,
        )

    post = Posts.create_post(form_data, user.id)
    enriched = Posts.get_post_by_id(post.id, viewer_id=user.id)
    if not enriched:
        log.error("Failed to reload community post after creation: %s", post.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MESSAGES.DEFAULT(),
        )
    return enriched


@router.post(
    "/community/posts/{post_id}/update", response_model=CommunityPostWithUser
)
async def update_post(
    request: Request,
    post_id: str,
    form_data: CommunityPostUpdateForm,
    user=Depends(get_verified_user),
):
    _ensure_community_enabled(request)
    post = Posts.update_post(post_id, form_data, user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    enriched = Posts.get_post_by_id(post.id, viewer_id=user.id)
    if not enriched:
        log.error("Failed to reload community post after update: %s", post.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MESSAGES.DEFAULT(),
        )
    return enriched


class StatusResponse(BaseModel):
    status: bool


@router.post("/community/posts/{post_id}/delete", response_model=StatusResponse)
async def delete_post(
    request: Request, post_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    deleted = Posts.delete_post(post_id, user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )
    return StatusResponse(status=True)


@router.get(
    "/community/posts/{post_id}", response_model=CommunityPostDetailResponse
)
async def get_post(
    request: Request, post_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    comments = Comments.get_comments(post_id, viewer_id=user.id)
    return CommunityPostDetailResponse(post=post, comments=comments)


############################
# Comments
############################


@router.get(
    "/community/posts/{post_id}/comments",
    response_model=list[CommunityCommentWithUser],
)
async def list_comments(
    request: Request, post_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    return Comments.get_comments(post_id, viewer_id=user.id)


@router.post(
    "/community/posts/{post_id}/comments",
    response_model=CommunityCommentWithUser,
)
async def create_comment(
    request: Request,
    post_id: str,
    form_data: CommunityCommentForm,
    user=Depends(get_verified_user),
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    if not form_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.VALIDATION_FAILED,
        )

    comment = Comments.create_comment(post_id, form_data, user.id)
    author = Users.get_user_by_id(user.id)
    author_response = (
        UserResponse(**author.model_dump()) if author else None
    )

    return CommunityCommentWithUser(
        **comment.model_dump(),
        author=author_response,
    )


@router.delete(
    "/community/posts/{post_id}/comments/{comment_id}",
    response_model=StatusResponse,
)
async def delete_comment(
    request: Request,
    post_id: str,
    comment_id: str,
    user=Depends(get_verified_user),
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    deleted = Comments.delete_comment(comment_id, user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    return StatusResponse(status=True)


############################
# Likes
############################


@router.post(
    "/community/posts/{post_id}/like",
    response_model=LikeResponse,
)
async def like_post(
    request: Request, post_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    Likes.like_post(post_id, user.id)
    like_count = Likes.get_like_count(post_id)
    return LikeResponse(liked=True, like_count=like_count)


@router.delete(
    "/community/posts/{post_id}/like",
    response_model=LikeResponse,
)
async def unlike_post(
    request: Request, post_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    post = Posts.get_post_by_id(post_id, viewer_id=user.id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    Likes.unlike_post(post_id, user.id)
    like_count = Likes.get_like_count(post_id)
    return LikeResponse(liked=False, like_count=like_count)


############################
# Follow
############################


@router.post(
    "/community/users/{target_user_id}/follow",
    response_model=FollowResponse,
)
async def follow_user(
    request: Request, target_user_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    target_user = Users.get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )

    Followers.follow(user.id, target_user_id)
    follower_count, _ = Followers.get_counts(target_user_id)
    return FollowResponse(following=True, follower_count=follower_count)


@router.delete(
    "/community/users/{target_user_id}/follow",
    response_model=FollowResponse,
)
async def unfollow_user(
    request: Request, target_user_id: str, user=Depends(get_verified_user)
):
    _ensure_community_enabled(request)
    target_user = Users.get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )

    Followers.unfollow(user.id, target_user_id)
    follower_count, _ = Followers.get_counts(target_user_id)
    return FollowResponse(following=False, follower_count=follower_count)


############################
# User Pages
############################


@router.get(
    "/community/users/{target_user_id}",
    response_model=CommunityUserPageResponse,
)
async def get_user_page(
    request: Request,
    target_user_id: str,
    page: Optional[int] = 1,
    limit: Optional[int] = None,
    user=Depends(get_verified_user),
):
    _ensure_community_enabled(request)
    target_user = Users.get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    limit = _get_limit(limit)
    page = max(1, page or 1)
    skip = (page - 1) * limit

    posts, total = Posts.get_posts(
        viewer_id=user.id,
        user_id=target_user_id,
        skip=skip,
        limit=limit,
    )

    follower_count, following_count = Followers.get_counts(target_user_id)

    profile = CommunityUserProfile(
        user=UserResponse(**target_user.model_dump()),
        follower_count=follower_count,
        following_count=following_count,
        viewer_is_following=Followers.is_following(user.id, target_user_id)
        if user.id != target_user_id
        else False,
    )

    return CommunityUserPageResponse(
        profile=profile,
        posts=CommunityPostListResponse(posts=posts, total=total),
    )
