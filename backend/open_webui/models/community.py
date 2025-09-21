import time
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict
from sqlalchemy import BigInteger, Column, JSON, Text, UniqueConstraint, func

from open_webui.internal.db import Base, get_db
from open_webui.models.users import UserResponse, Users


####################
# Community Post DB Schema
####################


class CommunityPost(Base):
    __tablename__ = "community_post"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, index=True, nullable=False)

    title = Column(Text, nullable=True)
    content = Column(Text, nullable=False)

    attachments = Column(JSON, nullable=True)
    meta = Column(JSON, nullable=True)

    created_at = Column(BigInteger, nullable=False)
    updated_at = Column(BigInteger, nullable=False)


class CommunityComment(Base):
    __tablename__ = "community_comment"

    id = Column(Text, primary_key=True)
    post_id = Column(Text, index=True, nullable=False)
    user_id = Column(Text, index=True, nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(BigInteger, nullable=False)
    updated_at = Column(BigInteger, nullable=False)


class CommunityPostLike(Base):
    __tablename__ = "community_post_like"

    id = Column(Text, primary_key=True)
    post_id = Column(Text, index=True, nullable=False)
    user_id = Column(Text, index=True, nullable=False)

    created_at = Column(BigInteger, nullable=False)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_community_post_like"),
    )


class CommunityFollow(Base):
    __tablename__ = "community_follow"

    id = Column(Text, primary_key=True)
    follower_id = Column(Text, index=True, nullable=False)
    following_id = Column(Text, index=True, nullable=False)

    created_at = Column(BigInteger, nullable=False)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_community_follow"),
    )


####################
# Pydantic Models
####################


class CommunityPostModel(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    content: str
    attachments: Optional[Any] = None
    meta: Optional[Any] = None
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class CommunityCommentModel(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class CommunityPostWithUser(CommunityPostModel):
    like_count: int = 0
    comment_count: int = 0
    viewer_has_liked: bool = False
    author: Optional[UserResponse] = None
    viewer_is_following_author: bool = False


class CommunityCommentWithUser(CommunityCommentModel):
    author: Optional[UserResponse] = None


class CommunityPostForm(BaseModel):
    title: Optional[str] = None
    content: str
    attachments: Optional[Any] = None
    meta: Optional[Any] = None


class CommunityPostUpdateForm(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    attachments: Optional[Any] = None
    meta: Optional[Any] = None


class CommunityCommentForm(BaseModel):
    content: str


class CommunityPostListResponse(BaseModel):
    posts: list[CommunityPostWithUser]
    total: int


class CommunityPostDetailResponse(BaseModel):
    post: CommunityPostWithUser
    comments: list[CommunityCommentWithUser]


class CommunityUserProfile(BaseModel):
    user: UserResponse
    follower_count: int
    following_count: int
    viewer_is_following: bool = False


class CommunityUserPageResponse(BaseModel):
    profile: CommunityUserProfile
    posts: CommunityPostListResponse


####################
# Table Managers
####################


def _current_time_ns() -> int:
    return int(time.time_ns())


class CommunityPostsTable:
    def create_post(self, form_data: CommunityPostForm, user_id: str) -> CommunityPostModel:
        with get_db() as db:
            post = CommunityPostModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=form_data.title,
                content=form_data.content,
                attachments=form_data.attachments,
                meta=form_data.meta,
                created_at=_current_time_ns(),
                updated_at=_current_time_ns(),
            )

            db.add(CommunityPost(**post.model_dump()))
            db.commit()

            return post

    def update_post(
        self, post_id: str, form_data: CommunityPostUpdateForm, user_id: str
    ) -> Optional[CommunityPostModel]:
        with get_db() as db:
            post = db.query(CommunityPost).filter_by(id=post_id, user_id=user_id).first()
            if not post:
                return None

            data = form_data.model_dump(exclude_unset=True)
            if "title" in data:
                post.title = data["title"]
            if "content" in data:
                post.content = data["content"]
            if "attachments" in data:
                post.attachments = data["attachments"]
            if "meta" in data:
                post.meta = data["meta"]

            post.updated_at = _current_time_ns()

            db.commit()
            return CommunityPostModel.model_validate(post)

    def delete_post(self, post_id: str, user_id: str) -> bool:
        with get_db() as db:
            post = (
                db.query(CommunityPost)
                .filter_by(id=post_id, user_id=user_id)
                .first()
            )
            if not post:
                return False

            db.delete(post)
            db.query(CommunityComment).filter_by(post_id=post_id).delete()
            db.query(CommunityPostLike).filter_by(post_id=post_id).delete()
            db.commit()
            return True

    def get_post_by_id(
        self, post_id: str, viewer_id: Optional[str] = None
    ) -> Optional[CommunityPostWithUser]:
        posts, _ = self.get_posts(viewer_id=viewer_id, post_ids=[post_id])
        return posts[0] if posts else None

    def get_posts(
        self,
        *,
        viewer_id: Optional[str] = None,
        user_id: Optional[str] = None,
        post_ids: Optional[list[str]] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> tuple[list[CommunityPostWithUser], int]:
        with get_db() as db:
            query = db.query(CommunityPost)

            if post_ids:
                query = query.filter(CommunityPost.id.in_(post_ids))

            if user_id:
                query = query.filter(CommunityPost.user_id == user_id)

            total = query.count()

            query = query.order_by(CommunityPost.created_at.desc())

            if skip is not None:
                query = query.offset(skip)
            if limit is not None:
                query = query.limit(limit)

            posts = query.all()
            if not posts:
                return [], total

            post_ids = [post.id for post in posts]
            author_ids = {post.user_id for post in posts}

            like_counts = dict(
                db.query(CommunityPostLike.post_id, func.count(CommunityPostLike.id))
                .filter(CommunityPostLike.post_id.in_(post_ids))
                .group_by(CommunityPostLike.post_id)
                .all()
            )

            comment_counts = dict(
                db.query(CommunityComment.post_id, func.count(CommunityComment.id))
                .filter(CommunityComment.post_id.in_(post_ids))
                .group_by(CommunityComment.post_id)
                .all()
            )

            viewer_likes: set[str] = set()
            viewer_following: set[str] = set()

            if viewer_id:
                viewer_likes = {
                    like.post_id
                    for like in db.query(CommunityPostLike)
                    .filter(
                        CommunityPostLike.user_id == viewer_id,
                        CommunityPostLike.post_id.in_(post_ids),
                    )
                    .all()
                }

                viewer_following = {
                    row.following_id
                    for row in db.query(CommunityFollow)
                    .filter(
                        CommunityFollow.follower_id == viewer_id,
                        CommunityFollow.following_id.in_(author_ids),
                    )
                    .all()
                }

            user_map: dict[str, UserResponse] = {}
            for author_id in author_ids:
                user = Users.get_user_by_id(author_id)
                if user:
                    user_map[author_id] = UserResponse(**user.model_dump())

            post_models: list[CommunityPostWithUser] = []
            for post in posts:
                post_model = CommunityPostWithUser(
                    **CommunityPostModel.model_validate(post).model_dump(),
                    like_count=like_counts.get(post.id, 0),
                    comment_count=comment_counts.get(post.id, 0),
                    viewer_has_liked=post.id in viewer_likes,
                    author=user_map.get(post.user_id),
                    viewer_is_following_author=post.user_id in viewer_following,
                )
                post_models.append(post_model)

            return post_models, total


class CommunityCommentsTable:
    def create_comment(
        self, post_id: str, form_data: CommunityCommentForm, user_id: str
    ) -> CommunityCommentModel:
        with get_db() as db:
            comment = CommunityCommentModel(
                id=str(uuid.uuid4()),
                post_id=post_id,
                user_id=user_id,
                content=form_data.content,
                created_at=_current_time_ns(),
                updated_at=_current_time_ns(),
            )

            db.add(CommunityComment(**comment.model_dump()))
            db.commit()
            return comment

    def get_comments(
        self, post_id: str, *, viewer_id: Optional[str] = None
    ) -> list[CommunityCommentWithUser]:
        with get_db() as db:
            comments = (
                db.query(CommunityComment)
                .filter(CommunityComment.post_id == post_id)
                .order_by(CommunityComment.created_at.asc())
                .all()
            )

            if not comments:
                return []

            user_ids = {comment.user_id for comment in comments}
            user_map: dict[str, UserResponse] = {}
            for user_id in user_ids:
                user = Users.get_user_by_id(user_id)
                if user:
                    user_map[user_id] = UserResponse(**user.model_dump())

            return [
                CommunityCommentWithUser(
                    **CommunityCommentModel.model_validate(comment).model_dump(),
                    author=user_map.get(comment.user_id),
                )
                for comment in comments
            ]

    def delete_comment(self, comment_id: str, user_id: str) -> bool:
        with get_db() as db:
            comment = (
                db.query(CommunityComment)
                .filter_by(id=comment_id, user_id=user_id)
                .first()
            )
            if not comment:
                return False

            db.delete(comment)
            db.commit()
            return True


class CommunityLikesTable:
    def like_post(self, post_id: str, user_id: str) -> bool:
        with get_db() as db:
            existing = (
                db.query(CommunityPostLike)
                .filter_by(post_id=post_id, user_id=user_id)
                .first()
            )
            if existing:
                return False

            like = CommunityPostLike(
                id=str(uuid.uuid4()),
                post_id=post_id,
                user_id=user_id,
                created_at=_current_time_ns(),
            )

            db.add(like)
            db.commit()
            return True

    def unlike_post(self, post_id: str, user_id: str) -> bool:
        with get_db() as db:
            deleted = (
                db.query(CommunityPostLike)
                .filter_by(post_id=post_id, user_id=user_id)
                .delete()
            )
            db.commit()
            return bool(deleted)

    def has_liked(self, post_id: str, user_id: str) -> bool:
        with get_db() as db:
            return (
                db.query(CommunityPostLike)
                .filter_by(post_id=post_id, user_id=user_id)
                .first()
                is not None
            )

    def get_like_count(self, post_id: str) -> int:
        with get_db() as db:
            return (
                db.query(func.count(CommunityPostLike.id))
                .filter(CommunityPostLike.post_id == post_id)
                .scalar()
                or 0
            )


class CommunityFollowersTable:
    def follow(self, follower_id: str, following_id: str) -> bool:
        if follower_id == following_id:
            return False

        with get_db() as db:
            existing = (
                db.query(CommunityFollow)
                .filter_by(follower_id=follower_id, following_id=following_id)
                .first()
            )
            if existing:
                return False

            follow = CommunityFollow(
                id=str(uuid.uuid4()),
                follower_id=follower_id,
                following_id=following_id,
                created_at=_current_time_ns(),
            )

            db.add(follow)
            db.commit()
            return True

    def unfollow(self, follower_id: str, following_id: str) -> bool:
        with get_db() as db:
            deleted = (
                db.query(CommunityFollow)
                .filter_by(follower_id=follower_id, following_id=following_id)
                .delete()
            )
            db.commit()
            return bool(deleted)

    def is_following(self, follower_id: str, following_id: str) -> bool:
        with get_db() as db:
            return (
                db.query(CommunityFollow)
                .filter_by(follower_id=follower_id, following_id=following_id)
                .first()
                is not None
            )

    def get_counts(self, user_id: str) -> tuple[int, int]:
        with get_db() as db:
            followers = (
                db.query(func.count(CommunityFollow.id))
                .filter(CommunityFollow.following_id == user_id)
                .scalar()
                or 0
            )

            following = (
                db.query(func.count(CommunityFollow.id))
                .filter(CommunityFollow.follower_id == user_id)
                .scalar()
                or 0
            )

            return followers, following


Posts = CommunityPostsTable()
Comments = CommunityCommentsTable()
Likes = CommunityLikesTable()
Followers = CommunityFollowersTable()
