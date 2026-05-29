import type { Meta, StoryObj } from "@storybook/react";
import { InviteNudge } from "./InviteNudge";

const meta: Meta<typeof InviteNudge> = {
  title: "Components/InviteNudge",
  component: InviteNudge,
  tags: ["autodocs"],
  args: {
    slug: "lakewood-heights",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Subtle nudge card placed below sparse content sections to encourage inviting neighbors. " +
          "Copy varies by section. Appears when content count is below the growth threshold.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InviteNudge>;

export const Library: Story = {
  args: { section: "library" },
};

export const Posts: Story = {
  args: { section: "posts" },
};

export const Directory: Story = {
  args: { section: "directory" },
};
