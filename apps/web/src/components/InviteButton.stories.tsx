import type { Meta, StoryObj } from "@storybook/react";
import { InviteButton } from "./InviteButton";

const meta: Meta<typeof InviteButton> = {
  title: "Components/InviteButton",
  component: InviteButton,
  tags: ["autodocs"],
  args: {
    slug: "lakewood-heights",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["card", "link", "text"],
      description: "Visual style of the button",
    },
    slug: {
      control: "text",
      description: "Neighborhood slug for the invite URL",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Button that opens a modal with invite link and QR code. " +
          "Supports copy-to-clipboard and QR download.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InviteButton>;

export const Card: Story = {
  args: {
    variant: "card",
  },
  parameters: {
    docs: {
      description: {
        story: "Default card variant with icon. Used in dashboard cards.",
      },
    },
  },
};

export const Link: Story = {
  args: {
    variant: "link",
  },
  parameters: {
    docs: {
      description: {
        story: "Link-style variant with wave emoji. Used in navigation.",
      },
    },
  },
};

export const Text: Story = {
  args: {
    variant: "text",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal text button. Used inline in sentences.",
      },
    },
  },
};
