"""Add community tables

Revision ID: b5b741edfe1e
Revises: 7826ab40b532
Create Date: 2025-01-05 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "b5b741edfe1e"
down_revision = "7826ab40b532"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "community_post",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("attachments", sa.JSON(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_community_post_user_id", "community_post", ["user_id"], unique=False
    )

    op.create_table(
        "community_comment",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("post_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_community_comment_post_id",
        "community_comment",
        ["post_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_comment_user_id",
        "community_comment",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "community_post_like",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("post_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_community_post_like"),
    )
    op.create_index(
        "ix_community_post_like_post_id",
        "community_post_like",
        ["post_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_post_like_user_id",
        "community_post_like",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "community_follow",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("follower_id", sa.Text(), nullable=False),
        sa.Column("following_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "following_id", name="uq_community_follow"),
    )
    op.create_index(
        "ix_community_follow_follower_id",
        "community_follow",
        ["follower_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_follow_following_id",
        "community_follow",
        ["following_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_community_follow_following_id", table_name="community_follow")
    op.drop_index("ix_community_follow_follower_id", table_name="community_follow")
    op.drop_table("community_follow")

    op.drop_index(
        "ix_community_post_like_user_id", table_name="community_post_like"
    )
    op.drop_index(
        "ix_community_post_like_post_id", table_name="community_post_like"
    )
    op.drop_table("community_post_like")

    op.drop_index("ix_community_comment_user_id", table_name="community_comment")
    op.drop_index("ix_community_comment_post_id", table_name="community_comment")
    op.drop_table("community_comment")

    op.drop_index("ix_community_post_user_id", table_name="community_post")
    op.drop_table("community_post")
