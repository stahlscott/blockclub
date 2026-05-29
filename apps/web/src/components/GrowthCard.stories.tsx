import type { Meta, StoryObj } from "@storybook/react";
import { GrowthCard } from "./GrowthCard";

const meta: Meta<typeof GrowthCard> = {
  title: "Components/GrowthCard",
  component: GrowthCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Dashboard card encouraging users to invite neighbors. " +
          "Shows member count, avatar stack, and share invite action. " +
          "Appears when neighborhood is below the growth threshold.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GrowthCard>;

export const FewMembers: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 3,
    members: [
      { id: "1", user: { name: "Sarah", avatar_url: null } },
      { id: "2", user: { name: "Mike", avatar_url: null } },
      { id: "3", user: { name: "Jordan", avatar_url: null } },
    ],
  },
};

export const SingleMember: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 1,
    members: [
      { id: "1", user: { name: "Sarah", avatar_url: null } },
    ],
  },
};

export const NoMembers: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 0,
    members: [],
  },
};
